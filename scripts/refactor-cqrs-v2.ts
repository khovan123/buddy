import * as path from 'path';
import { Project } from 'ts-morph';

async function main() {
  const workspaceRoot = process.cwd().replace(/\\/g, '/');
  const project = new Project({
    tsConfigFilePath: path.posix.join(workspaceRoot, 'tsconfig.base.json'),
    skipAddingFilesFromTsConfig: true,
  });

  console.log('Loading source files...');
  project.addSourceFilesAtPaths([
    path.posix.join(workspaceRoot, 'services/*/src/**/*.ts'),
    path.posix.join(workspaceRoot, 'libs/**/*.ts'),
  ]);

  const sourceFiles = project.getSourceFiles();

  // Find all classes that look like commands/queries
  const allTargetClasses = [];

  for (const sf of sourceFiles) {
    if (
      !sf.getFilePath().includes('/handlers/') &&
      !sf.getFilePath().includes('command.ts') &&
      !sf.getFilePath().includes('query.ts')
    ) {
      // Find classes in handler files AND previously extracted files
      if (sf.getFilePath().endsWith('.handler.ts')) {
        for (const classDecl of sf.getClasses()) {
          const name = classDecl.getName();
          if (
            name &&
            (name.endsWith('Command') || name.endsWith('Query')) &&
            !name.endsWith('Handler')
          ) {
            allTargetClasses.push(classDecl);
          }
        }
      }
    } else if (sf.getFilePath().endsWith('.command.ts') || sf.getFilePath().endsWith('.query.ts')) {
      for (const classDecl of sf.getClasses()) {
        if (classDecl.isExported()) {
          allTargetClasses.push(classDecl);
        }
      }
    }
  }

  const toDashCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  console.log(`Found ${allTargetClasses.length} command/query classes to process.`);

  // First pass: Analyze cross-service usage to determine if COMMON
  const classToServiceMap = new Map<string, Set<string>>();

  for (const classDecl of allTargetClasses) {
    const className = classDecl.getName() as string;
    classToServiceMap.set(className, new Set());

    const refs = project.getLanguageService().findReferencesAsNodes(classDecl);
    for (const node of refs) {
      const sf = node.getSourceFile();
      const match = sf.getFilePath().match(/services\/([^/]+)\/src/);
      if (match) {
        classToServiceMap.get(className)!.add(match[1]);
      }
    }
  }

  // Second pass: Extract and move
  for (const classDecl of allTargetClasses) {
    const className = classDecl.getName() as string;
    const isCommand = className.endsWith('Command');
    const typeName = isCommand ? 'command' : 'query';
    const targetFileName = `${toDashCase(className).replace(`-${typeName}`, '')}.${typeName}.ts`;

    const usingServices = classToServiceMap.get(className)!;
    const isCommon = usingServices.size > 1;

    let parentDirPath = '';
    if (isCommon) {
      // Move to root /contracts/src/...
      parentDirPath = path.posix.join(workspaceRoot, 'libs/contracts/src', `${typeName}s`);
      console.log(
        `[COMMON] Moving ${className} to contracts (${Array.from(usingServices).join(', ')})`,
      );
    } else {
      // Stay in local service
      const originalFile = classDecl.getSourceFile();
      // Find the base service dir
      const match = originalFile.getFilePath().match(/(.*\/services\/[^/]+\/src\/application\/)/);
      if (match) {
        parentDirPath = path.join(match[1], `${typeName}s`);
      } else {
        parentDirPath = originalFile.getDirectory().getPath();
      }
    }

    const targetPath = path.join(parentDirPath, targetFileName);

    let targetFile = project.getSourceFile(targetPath);
    if (!targetFile) {
      targetFile = project.createSourceFile(targetPath, '', { overwrite: false });
    }

    // Add the structure to the new file, stripping ICommand/IQuery
    const structure = classDecl.getStructure() as any;
    if (structure.implements) {
      structure.implements = structure.implements.filter(
        (imp: string) => imp !== 'ICommand' && imp !== 'IQuery',
      );
    }
    targetFile.addClass(structure);

    // Copy necessary imports, excluding @nestjs/cqrs ICommand/IQuery
    const imports = classDecl.getSourceFile().getImportDeclarations();
    for (const imp of imports) {
      try {
        const newImp = imp.getStructure();
        if (newImp.moduleSpecifier === '@nestjs/cqrs') {
          if (newImp.namedImports) {
            newImp.namedImports = (newImp.namedImports as any[]).filter(
              (ni) =>
                (typeof ni === 'string' ? ni : ni.name) !== 'ICommand' &&
                (typeof ni === 'string' ? ni : ni.name) !== 'IQuery',
            );
            if (newImp.namedImports.length === 0) continue;
          }
        }
        targetFile.addImportDeclaration(newImp);
      } catch (e) {}
    }

    // Re-map references across the whole project
    const refs = project.getLanguageService().findReferencesAsNodes(classDecl);
    for (const node of refs) {
      const sf = node.getSourceFile();
      if (sf.getFilePath() === targetFile.getFilePath()) continue;

      let relativePath = path.posix.relative(sf.getDirectory().getPath(), targetPath);
      if (!relativePath.startsWith('.') && !isCommon) relativePath = './' + relativePath;
      if (isCommon) {
        // If it's common, import from @libs/contracts!
        relativePath = '@libs/contracts';
      } else {
        relativePath = relativePath.replace('.ts', '');
      }

      // Check if import already exists
      const existingImp = sf
        .getImportDeclarations()
        .find((i) => i.getModuleSpecifierValue() === relativePath);
      if (existingImp) {
        if (!existingImp.getNamedImports().some((ni) => ni.getName() === className)) {
          existingImp.addNamedImport(className);
        }
      } else {
        sf.addImportDeclaration({
          namedImports: [className],
          moduleSpecifier: relativePath,
        });
      }

      // Remove the old import
      for (const imp of sf.getImportDeclarations()) {
        if (
          imp.getModuleSpecifierValue() !== relativePath &&
          imp.getNamedImports().some((ni) => ni.getName() === className)
        ) {
          const targetNI = imp.getNamedImports().find((ni) => ni.getName() === className);
          if (targetNI) targetNI.remove();
          if (imp.getNamedImports().length === 0) imp.remove();
        }
      }
    }

    // Remove original class
    classDecl.remove();
  }

  // Final cleanup passes are disabled for speed
  console.log('Saving all changes...');
  const contractsIndex = project.getSourceFile(
    path.posix.join(workspaceRoot, 'libs/contracts/src/index.ts'),
  );
  if (contractsIndex) {
    const commonDir = path.posix.join(workspaceRoot, 'libs/contracts/src');
    const addedFiles = project
      .getSourceFiles()
      .filter(
        (sf) =>
          sf.getFilePath().includes(commonDir) && sf.getFilePath() !== contractsIndex.getFilePath(),
      );
    for (const sf of addedFiles) {
      let rel = path.posix.relative(commonDir, sf.getFilePath()).replace('.ts', '');
      if (!rel.startsWith('.')) rel = './' + rel;
      const exports = contractsIndex.getExportDeclarations();
      if (!exports.some((e) => e.getModuleSpecifierValue() === rel)) {
        contractsIndex.addExportDeclaration({ moduleSpecifier: rel });
      }
    }
  }

  console.log('Saving all changes...');
  await project.save();
  console.log('Done!');
}

main().catch(console.error);
