import assert from 'assert';
import sinon from 'sinon';
import auth from '../../../Auth.js';
import { Logger } from '../../../cli/Logger.js';
import { telemetry } from '../../../telemetry.js';
import { pid } from '../../../utils/pid.js';
import { session } from '../../../utils/session.js';
import { sinonUtil } from '../../../utils/sinonUtil.js';
import { cli } from '../../../cli/cli.js';
import { CommandInfo } from '../../../cli/CommandInfo.js';
import commands from '../commands.js';
import command from './agent-search.js';

describe(commands.SEARCH, () => {
  let log: any[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;
  let commandInfo: CommandInfo;

  before(() => {
    sinon.stub(auth, 'restoreAuth').resolves();
    sinon.stub(telemetry, 'trackEvent').resolves();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
    auth.connection.active = true;
    commandInfo = cli.getCommandInfo(command);
    sinon.stub(cli, 'getSettingWithDefaultValue').returnsArg(1);
  });

  beforeEach(() => {
    log = [];
    logger = {
      log: async (msg: any) => {
        log.push(msg);
      },
      logRaw: async (msg: any) => {
        log.push(msg);
      },
      logToStderr: async (msg: any) => {
        log.push(msg);
      }
    };
    loggerLogSpy = sinon.spy(logger, 'log');
  });

  afterEach(() => {
    sinonUtil.restore([]);
  });

  after(() => {
    sinon.restore();
    auth.connection.active = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.SEARCH);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('defines correct properties for the default output', () => {
    assert.deepStrictEqual(command.defaultProperties(), ['module', 'operation', 'description']);
  });

  it('fails validation if module is not valid', async () => {
    const actual = await command.validate({ options: { module: 'invalid' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation with no options', async () => {
    const actual = await command.validate({ options: {} }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation with valid module', async () => {
    const actual = await command.validate({ options: { module: 'mail' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('returns all operations when no filters specified', async () => {
    await command.action(logger, { options: {} });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert(result.length > 0);
    // Verify each entry has the expected shape
    for (const entry of result) {
      assert(typeof entry.module === 'string');
      assert(typeof entry.operation === 'string');
      assert(typeof entry.description === 'string');
    }
  });

  it('filters operations by module', async () => {
    await command.action(logger, { options: { module: 'mail' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert(result.length > 0);
    for (const entry of result) {
      assert.strictEqual(entry.module, 'mail');
    }
  });

  it('filters operations by query matching operation name', async () => {
    await command.action(logger, { options: { query: 'listInbox' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert(result.length > 0);
    const hasMatch = result.some((op: any) => op.operation.toLowerCase().includes('listinbox'));
    assert(hasMatch);
  });

  it('filters operations by query matching description', async () => {
    await command.action(logger, { options: { query: 'inbox' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert(result.length > 0);
  });

  it('filters operations by both module and query', async () => {
    await command.action(logger, { options: { module: 'mail', query: 'send' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    for (const entry of result) {
      assert.strictEqual(entry.module, 'mail');
    }
  });

  it('returns empty array when query matches nothing', async () => {
    await command.action(logger, { options: { query: 'xyznonexistent123' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert.strictEqual(result.length, 0);
  });

  it('includes operations from all seven modules', async () => {
    await command.action(logger, { options: {} });
    const result = loggerLogSpy.firstCall.args[0];
    const moduleNames = new Set(result.map((op: any) => op.module));
    assert(moduleNames.has('mail'));
    assert(moduleNames.has('calendar'));
    assert(moduleNames.has('teams'));
    assert(moduleNames.has('files'));
    assert(moduleNames.has('tasks'));
    assert(moduleNames.has('people'));
    assert(moduleNames.has('search'));
  });

  it('query filtering is case-insensitive', async () => {
    await command.action(logger, { options: { query: 'LISTINBOX' } });
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result));
    assert(result.length > 0);
  });
});
