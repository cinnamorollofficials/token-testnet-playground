#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { registerSeedCommands } from './cli/commands/seed.js';
import { registerAddressCommands } from './cli/commands/address.js';
import { registerBalanceCommands } from './cli/commands/balance.js';
import { registerFaucetCommands } from './cli/commands/faucet.js';
import { registerSendCommands } from './cli/commands/send.js';

dotenv.config();

const program = new Command();

program
  .name('pg')
  .description('Token Testing & Faucet Playground (Testnet Only)')
  .version('1.0.0');

registerSeedCommands(program);
registerAddressCommands(program);
registerBalanceCommands(program);
registerFaucetCommands(program);
registerSendCommands(program);

program.parse(process.argv);
