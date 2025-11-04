#!/usr/bin/env node

import process from 'process';
import { run } from '../src/index.js';

const args = process.argv.slice(2);

run(args);
