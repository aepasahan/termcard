/**
 * create_card_project: writes a card package to the user's computer (local server only).
 * It never overwrites files and never publishes.
 */

import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { createProject, TargetNotEmptyError } from '../project/scaffold.js';
import { validatePackageName, binName } from '../project/names.js';
import { ToolError } from './protocol.js';
import { validate } from './design.js';

const configSchema = { type: 'object', description: 'The card configuration (card.config.json). Call list_card_options for the fields.' };

/** "~/cards/jane" → absolute path; refuses relative paths and the file-system root. */
function resolveDirectory(directory, packageName) {
  const raw = typeof directory === 'string' && directory.trim() ? directory.trim() : join('~', 'termcard-cards', binName(packageName));
  const expanded = raw === '~' || raw.startsWith('~/') ? join(homedir(), raw.slice(1)) : raw;
  if (!isAbsolute(expanded)) throw new ToolError('Please give an absolute folder path (or one starting with ~/).');
  const dir = resolve(expanded);
  if (dir === resolve('/') || dir === homedir()) throw new ToolError('Please choose a dedicated, empty folder for the card.');
  return dir;
}

/** The tool definition, added to the local server. */
export function createProjectTool() {
  return {
    name: 'create_card_project',
    title: 'Create the card project',
    description: 'Writes a ready-to-publish card package (card.config.json, package.json, README, license) into a new, empty folder on the user\'s computer. It never overwrites files and never publishes. Ask the user to confirm the details, the name and the folder first.',
    inputSchema: {
      type: 'object',
      properties: {
        config: configSchema,
        packageName: { type: 'string', description: 'npm package name, checked with check_name.' },
        directory: { type: 'string', description: 'Absolute path (or ~/…) of a new or empty folder. Defaults to ~/termcard-cards/<name>.' },
      },
      required: ['config', 'packageName'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: async ({ config, packageName, directory }) => {
      const nameProblem = validatePackageName(typeof packageName === 'string' ? packageName : '');
      if (nameProblem) throw new ToolError(`Package name: ${nameProblem}.`);
      const { problems } = validate(config);
      if (problems) throw new ToolError(`The card config has problems:\n- ${problems.join('\n- ')}`);
      const dir = resolveDirectory(directory, packageName);
      let files;
      try {
        files = createProject({ dir, packageName, config });
      } catch (error) {
        if (error instanceof TargetNotEmptyError) throw new ToolError(`${dir} already exists and is not empty. Choose another folder.`);
        throw new ToolError(`Could not write the project: ${error.code ?? error.message}`);
      }
      return {
        directory: dir,
        files,
        published: false,
        nextSteps: [
          `Open a terminal in ${dir}`,
          'Optional: `npm install && npm start` to try the card',
          '`npm publish --access public` (log in first with `npm login` if needed)',
          `Share it: npx ${packageName}`,
        ],
        note: 'Nothing was published. The user publishes the card themselves when they are ready.',
      };
    },
  };
}
