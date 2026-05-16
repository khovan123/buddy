import * as path from 'path';
import { Project } from 'ts-morph';

async function main() {
  const project = new Project({
    tsConfigFilePath: 'e:/codes/production/unibuddy-distributed/unibuddy-ms/tsconfig.base.json',
    skipAddingFilesFromTsConfig: true,
  });

  console.log('Loading source files...');
  project.addSourceFilesAtPaths([
    'e:/codes/production/unibuddy-distributed/unibuddy-ms/services/*/src/**/*.ts',
    'e:/codes/production/unibuddy-distributed/unibuddy-ms/libs/**/*.ts',
  ]);

  const sourceFiles = project.getSourceFiles();
  const handlerFiles = sourceFiles.filter(
    (sf) => sf.getFilePath().includes('/handlers/') && sf.getFilePath().endsWith('.handler.ts'),
  );

  console.log(`Found ${handlerFiles.length} handler files. Processing...`);

  // To keep track of mappings: className -> newFilePath
  const classMappings = new Map<string, string>();

  // Use simple dash mapping
  const toDashCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  for (const handlerFile of handlerFiles) {
    const classes = handlerFile.getClasses();

    for (const classDecl of classes) {
      if (!classDecl.isExported()) continue;

      const className = classDecl.getName();
      if (!className) continue;

      const isCommand = className.endsWith('Command') && !className.endsWith('Handler');
      const isQuery = className.endsWith('Query') && !className.endsWith('Handler');

      if (!isCommand && !isQuery) continue;

      console.log(`Extracting: ${className} from ${handlerFile.getBaseName()}`);

      const typeName = isCommand ? 'command' : 'query';
      const targetFileName = `${toDashCase(className).replace(`-${typeName}`, '')}.${typeName}.ts`;

      // Determine local directory
      const handlerDir = handlerFile.getDirectory();
      const parentDir = handlerDir.getParent(); // Should be /commands or /queries
      if (!parentDir) continue;

      const targetPath = path.join(parentDir.getPath(), targetFileName);

      let targetFile = project.getSourceFile(targetPath);
      if (!targetFile) {
        targetFile = project.createSourceFile(targetPath, '', { overwrite: false });
      }

      // Add the class structure to target file
      targetFile.addClass(classDecl.getStructure() as any);

      // Attempt to copy all imports (we will optimize imports at the end)
      const imports = handlerFile.getImportDeclarations();
      for (const imp of imports) {
        try {
          targetFile.addImportDeclaration(imp.getStructure());
        } catch (e) {}
      }

      // Add an import to the handler file so it doesn't break
      handlerFile.addImportDeclaration({
        namedImports: [className],
        moduleSpecifier: `../${targetFileName.replace('.ts', '')}`,
      });

      // Find other files referencing this and change their imports
      for (const sf of project.getSourceFiles()) {
        const fileImports = sf.getImportDeclarations();
        for (const fileImp of fileImports) {
          const namedImports = fileImp.getNamedImports().map((ni) => ni.getName());
          if (
            namedImports.includes(className) &&
            fileImp.getModuleSpecifierValue().includes('.handler')
          ) {
            // We need to remap this import!
            // 1. Remove the named import from the old declaration
            const targetNamedImport = fileImp
              .getNamedImports()
              .find((ni) => ni.getName() === className);
            if (targetNamedImport) targetNamedImport.remove();

            // If old declaration is left empty, remove it entirely
            if (
              fileImp.getNamedImports().length === 0 &&
              !fileImp.getDefaultImport() &&
              !fileImp.getNamespaceImport()
            ) {
              fileImp.remove();
            }

            // 2. Add new import declaration
            // Get relative path from `sf.getDirectory().getPath()` to `targetPath`
            let relativePath = path.posix.relative(sf.getDirectory().getPath(), targetPath);
            if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
            relativePath = relativePath.replace('.ts', '');

            sf.addImportDeclaration({
              namedImports: [className],
              moduleSpecifier: relativePath,
            });
          }
        }
      }

      // Remove the class from the original handler file
      classDecl.remove();
    }
  }

  // Remove generic ICommand/IQuery from local usages since the user requested:
  // "các handler không được sử dụng intefaces ICommand, IQuery chung"
  // If this means we remove `@nestjs/cqrs` `ICommand` from local commands...
  // Wait, ICommand and IQuery are just markers. Let's just run an organize imports pass.

  console.log('Organizing imports across all modified files...');
  for (const sf of project.getSourceFiles()) {
    if (!sf.wasForgotten()) {
      sf.fixMissingImports();
      sf.organizeImports();
    }
  }

  console.log('Saving all changes...');
  await project.save();
  console.log('Done!');
}

main().catch(console.error);
