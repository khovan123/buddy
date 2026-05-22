import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const root = process.cwd()
const registryPath = path.join(root, "src/config/micro-frontends.ts")
const mfeConfigPath = path.join(root, "microfrontends.json")
const appRoot = path.join(root, "src/app")
const registrySource = readFileSync(registryPath, "utf8")

const definitionPattern =
  /{\s*id:\s*"(?<id>[^"]+)"[\s\S]*?mountMode:\s*"(?<mountMode>[^"]+)"[\s\S]*?sourceRoot:\s*"(?<sourceRoot>[^"]+)"[\s\S]*?routes:\s*\[(?<routes>[\s\S]*?)\]\s*,\s*contract:/g

const definitions = [...registrySource.matchAll(definitionPattern)].map((match) => ({
  id: match.groups.id,
  mountMode: match.groups.mountMode,
  sourceRoot: match.groups.sourceRoot,
  routes: [...match.groups.routes.matchAll(/path:\s*"(?<path>[^"]+)"/g)].map((routeMatch) => routeMatch.groups.path),
}))

const errors = []

function relativeSourceRoot(sourceRoot) {
  return sourceRoot.replace(/^webapp\//, "")
}

function collectFiles(directory) {
  const entries = readdirSync(directory)

  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry)
    const stats = statSync(entryPath)

    if (stats.isDirectory()) {
      if ([".next", "node_modules"].includes(entry)) {
        return []
      }

      return collectFiles(entryPath)
    }

    return [entryPath]
  })
}

function childDirectories(directory) {
  return readdirSync(directory)
    .map((entry) => path.join(directory, entry))
    .filter((entryPath) => statSync(entryPath).isDirectory())
}

function matchesSegment(directory, segment) {
  const directoryName = path.basename(directory)

  return directoryName === segment || /^\[.+\]$/.test(directoryName)
}

function findRouteDirectory(currentDirectory, segments) {
  if (segments.length === 0) {
    const hasEntrypoint = ["page.tsx", "layout.tsx", "route.ts"].some((entrypoint) =>
      existsSync(path.join(currentDirectory, entrypoint))
    )

    if (hasEntrypoint) {
      return currentDirectory
    }

    for (const directory of childDirectories(currentDirectory)) {
      if (/^\(.+\)$/.test(path.basename(directory))) {
        const groupMatch = findRouteDirectory(directory, segments)

        if (groupMatch) {
          return groupMatch
        }
      }
    }

    return null
  }

  const [segment, ...remaining] = segments

  for (const directory of childDirectories(currentDirectory)) {
    if (matchesSegment(directory, segment)) {
      const exactMatch = findRouteDirectory(directory, remaining)

      if (exactMatch) {
        return exactMatch
      }
    }

    if (/^\(.+\)$/.test(path.basename(directory))) {
      const groupMatch = findRouteDirectory(directory, segments)

      if (groupMatch) {
        return groupMatch
      }
    }
  }

  return null
}

function assertRouteExists(routePath) {
  if (routePath === "/") {
    if (!findRouteDirectory(appRoot, [])) {
      errors.push("Route / is registered but no root page/layout exists in src/app or a route group.")
    }

    return
  }

  const segments = routePath.split("/").filter(Boolean)
  const routeDirectory = findRouteDirectory(appRoot, segments)

  if (!routeDirectory) {
    errors.push(`Route ${routePath} is registered but no matching App Router directory exists.`)

    return
  }

  const hasEntrypoint = ["page.tsx", "layout.tsx", "route.ts"].some((entrypoint) =>
    existsSync(path.join(routeDirectory, entrypoint))
  )

  if (!hasEntrypoint) {
    errors.push(`Route ${routePath} resolves to ${path.relative(root, routeDirectory)} without page/layout/route.`)
  }
}

if (definitions.length === 0) {
  errors.push("No micro-frontend definitions were found in src/config/micro-frontends.ts.")
}

for (const definition of definitions) {
  const sourceRoot = path.join(root, relativeSourceRoot(definition.sourceRoot))

  if (!existsSync(sourceRoot)) {
    errors.push(`${definition.id} sourceRoot does not exist: ${definition.sourceRoot}`)
    continue
  }

  if (["package", "remote"].includes(definition.mountMode)) {
    const hasPublicEntrypoint = ["index.ts", "index.tsx"].some((entrypoint) =>
      existsSync(path.join(sourceRoot, entrypoint))
    )

    if (!hasPublicEntrypoint) {
      errors.push(`${definition.id} is ${definition.mountMode} mounted but has no public index.ts entrypoint.`)
    }
  }

  for (const routePath of definition.routes) {
    assertRouteExists(routePath)
  }
}

const packageFeatureNames = definitions
  .filter((definition) => ["package", "remote"].includes(definition.mountMode))
  .map((definition) => path.basename(definition.sourceRoot))

const appFiles = collectFiles(appRoot).filter((filePath) => /\.(tsx?|jsx?)$/.test(filePath))

for (const filePath of appFiles) {
  const source = readFileSync(filePath, "utf8")

  for (const featureName of packageFeatureNames) {
    const deepImportPattern = new RegExp(`@/features/${featureName}/(?!$)`)

    if (deepImportPattern.test(source)) {
      errors.push(
        `${path.relative(root, filePath)} imports @/features/${featureName}/ internals. Use @/features/${featureName}.`
      )
    }
  }
}

// ── Cross-validate microfrontends.json ──────────────────────────────────────
if (!existsSync(mfeConfigPath)) {
  errors.push("microfrontends.json does not exist at the project root.")
} else {
  try {
    const mfeConfig = JSON.parse(readFileSync(mfeConfigPath, "utf8"))

    if (!mfeConfig.$schema) {
      errors.push("microfrontends.json is missing the $schema field.")
    }

    if (!mfeConfig.applications || typeof mfeConfig.applications !== "object") {
      errors.push("microfrontends.json is missing the applications field.")
    } else {
      const appNames = Object.keys(mfeConfig.applications)
      const appsWithRouting = appNames.filter(
        (name) => mfeConfig.applications[name].routing?.length > 0
      )
      const defaultApps = appNames.filter(
        (name) => !mfeConfig.applications[name].routing?.length
      )

      console.info(`microfrontends.json: ${appNames.length} application(s) registered.`)
      if (defaultApps.length > 0) {
        console.info(`  Default app (catches all unmatched routes): ${defaultApps.join(", ")}`)
      }
      if (appsWithRouting.length > 0) {
        for (const appName of appsWithRouting) {
          const paths = mfeConfig.applications[appName].routing
            .flatMap((rule) => rule.paths || [])
          console.info(`  ${appName}: ${paths.join(", ")}`)
        }
      }
    }
  } catch (parseError) {
    errors.push(`microfrontends.json is not valid JSON: ${parseError.message}`)
  }
}

if (errors.length > 0) {
  console.error("Micro-frontend validation failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.info(`Micro-frontend validation passed for ${definitions.length} registered slices.`)
