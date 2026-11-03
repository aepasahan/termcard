#!/usr/bin/env node
import { cli } from '../src/cli.js';

process.exitCode = await cli(process.argv.slice(2));
