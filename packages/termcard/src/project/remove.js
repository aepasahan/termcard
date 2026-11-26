/**
 * `termcard remove`: takes a published card off npm, so its details stop being public.
 *
 * Termcard never stores cards itself; a card is an npm package in its owner's account. Removal
 * therefore runs the owner's own npm CLI: `npm unpublish` deletes every version. When npm's
 * policy does not allow that (https://docs.npmjs.com/policies/unpublish), the card is
 * deprecated instead: npx then warns that it was removed, Termcard's AI tools stop showing it,
 * and the owner can ask npm support to delete it.
 */

import { npm, ensureNpmLogin } from './npm.js';
import { validatePackageName } from './names.js';

export const REMOVED_MESSAGE = 'This Termcard card has been removed by its owner.';

/**
 * @param {string} name  package name of the card
 * @param {{ yes?: boolean, interactive?: boolean, ask?: (q: string) => Promise<string>,
 *           stdout: { write(s: string): void }, stderr: { write(s: string): void },
 *           cwd?: string, run?: typeof npm }} options
 * @returns {Promise<number>} exit code
 */
export async function removeCard(name, { yes = false, interactive = false, ask, stdout, stderr, cwd, run = npm }) {
  const problem = validatePackageName(name);
  if (problem) {
    stderr.write(`"${name}" is not a valid package name: ${problem}.\n`);
    return 2;
  }

  stdout.write(
    `This removes the card ${name} from npm — every version — so it is no longer public.\n\n` +
      `  • npx ${name} stops working for everyone.\n` +
      `  • AI assistants using Termcard stop showing the card within 10 minutes.\n` +
      `  • Copies people already downloaded, and web pages you built from the card, are not\n` +
      `    affected; delete those yourself. Your local files are not touched.\n` +
      `  • npm blocks the name for 24 hours before anyone can use it again.\n\n`,
  );

  if (!yes) {
    if (!interactive || !ask) {
      stderr.write(`To confirm, run this in a terminal or pass --yes.\n`);
      return 1;
    }
    const answer = (await ask(`Type ${name} to remove it: `)).trim();
    if (answer !== name) {
      stdout.write('Nothing was removed.\n');
      return 1;
    }
  }

  if (!(await ensureNpmLogin({ cwd, run }))) {
    stderr.write('Could not log in to npm. Nothing was removed.\n');
    return 1;
  }

  if ((await run(['unpublish', name, '--force'], { cwd })) === 0) {
    stdout.write(`\n✓ ${name} was removed from npm.\n`);
    return 0;
  }

  // npm refuses e.g. after 72 hours for packages with dependents or many downloads,
  // or when you are not the package's owner.
  stdout.write(
    `\nnpm did not delete the package (see the message above). Marking every version as\n` +
      `removed instead, so npx warns people and Termcard's AI tools stop showing the card.\n`,
  );
  if ((await run(['deprecate', name, REMOVED_MESSAGE], { cwd })) !== 0) {
    stderr.write(`\nThat did not work either. Check that you own ${name} on npm and try again.\n`);
    return 1;
  }
  stdout.write(
    `\n✓ ${name} is marked as removed.\n` +
      `  To have npm delete it entirely, contact npm support at https://www.npmjs.com/support\n` +
      `  and ask for the package to be removed; you can cite your right to erasure (GDPR/KVKK).\n`,
  );
  return 0;
}
