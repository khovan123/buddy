import * as path from 'path';
import { Project } from 'ts-morph';

const workspaceRoot = process.cwd().replace(/\\/g, '/');
const project = new Project();
project.addSourceFilesAtPaths([
  path.posix.join(workspaceRoot, 'services/*/src/**/*.ts'),
  path.posix.join(workspaceRoot, 'libs/*/src/**/*.ts'),
]);

function camelToSentence(text: string): string {
  const result = text.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
}

console.log('Generating JSDocs for the workspace...');
let processedFiles = 0;

for (const sf of project.getSourceFiles()) {
  const path = sf.getFilePath();
  if (path.includes('.spec.ts') || path.includes('.test.ts') || sf.getBaseName() === 'index.ts')
    continue;

  let modified = false;

  // Document Classes
  for (const cls of sf.getClasses()) {
    if (cls.getJsDocs().length === 0 && cls.getName()) {
      const name = cls.getName()!;
      let docText = '';
      if (name.endsWith('Controller'))
        docText = `Controller handling incoming requests for ${name.replace('Controller', '')}.`;
      else if (name.endsWith('Command'))
        docText = `CQRS Command designed to enforce ${camelToSentence(name.replace('Command', ''))}.`;
      else if (name.endsWith('Query'))
        docText = `CQRS Query for retrieving ${camelToSentence(name.replace('Query', ''))} data.`;
      else if (name.endsWith('Handler'))
        docText = `CQRS Handler to execute ${camelToSentence(name.replace('Handler', ''))}.`;
      else if (name.endsWith('Dto'))
        docText = `Data Transfer Object for ${camelToSentence(name.replace('Dto', ''))}.`;
      else if (name.endsWith('Entity') || name.endsWith('Aggregate'))
        docText = `Domain Entity/Aggregate representing ${camelToSentence(name.replace(/(Entity|Aggregate)/, ''))}.`;
      else if (name.endsWith('Repository'))
        docText = `Repository interface/implementation for ${camelToSentence(name.replace('Repository', ''))} data access.`;
      else if (name.endsWith('Service'))
        docText = `Service handling business logic for ${camelToSentence(name.replace('Service', ''))}.`;
      else if (name.endsWith('Module'))
        docText = `NestJS Module for ${camelToSentence(name.replace('Module', ''))}.`;
      else docText = `Represents the ${camelToSentence(name)} component.`;

      cls.addJsDoc(docText);
      modified = true;
    }

    // Document Class Methods
    for (const method of cls.getMethods()) {
      if (
        method.getJsDocs().length === 0 &&
        method.getName() &&
        !method.getName().startsWith('_')
      ) {
        const name = method.getName();
        // Skip standard lifecycle hooks to avoid noise
        if (['onModuleInit', 'onModuleDestroy', 'constructor'].includes(name)) continue;

        let doc = `Executes the ${camelToSentence(name).toLowerCase()} operation.\n`;

        for (const p of method.getParameters()) {
          doc += `\n@param ${p.getName()} - The ${p.getName()} parameter`;
        }
        const ret = method.getReturnTypeNode();
        if (ret && ret.getText() !== 'void' && ret.getText() !== 'Promise<void>') {
          doc += `\n@returns Result of type ${ret.getText()}`;
        }

        try {
          method.addJsDoc(doc);
          modified = true;
        } catch {
          // Sometimes formatting can fail, silently swallow for AST robustness
        }
      }
    }
  }

  // Document Interfaces
  for (const intf of sf.getInterfaces()) {
    if (intf.getJsDocs().length === 0 && intf.getName()) {
      intf.addJsDoc(
        `Interface representing data constraints for ${camelToSentence(intf.getName())}.`,
      );
      modified = true;
    }
  }

  if (modified) {
    processedFiles++;
  }
}

console.log(`Modified ${processedFiles} files. Saving all changes...`);
project.saveSync();
console.log('JSDoc generation completed successfully!');
