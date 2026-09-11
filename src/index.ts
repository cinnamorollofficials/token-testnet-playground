#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { registerSeedCommands } from './cli/commands/seed.js';
import { registerAddressCommands } from './cli/commands/address.js';

dotenv.config();

const program = new Command();

program
  .name('pg')
  .description('Token Testing & Faucet Playground (Testnet Only)')
  .version('1.0.0');

registerSeedCommands(program);
registerAddressCommands(program);

program.parse(process.argv);
