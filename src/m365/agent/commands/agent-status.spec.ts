import assert from 'assert';
import sinon from 'sinon';
import auth from '../../../Auth.js';
import { Logger } from '../../../cli/Logger.js';
import { telemetry } from '../../../telemetry.js';
import { pid } from '../../../utils/pid.js';
import { session } from '../../../utils/session.js';
import { sinonUtil } from '../../../utils/sinonUtil.js';
import { cli } from '../../../cli/cli.js';
import commands from '../commands.js';
import command from './agent-status.js';

describe(commands.STATUS, () => {
  let log: any[];
  let logger: Logger;
  let loggerLogSpy: sinon.SinonSpy;

  before(() => {
    sinon.stub(auth, 'restoreAuth').resolves();
    sinon.stub(telemetry, 'trackEvent').resolves();
    sinon.stub(pid, 'getProcessName').returns('');
    sinon.stub(session, 'getId').returns('');
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
    assert.strictEqual(command.name, commands.STATUS);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('shows connected status when authenticated', async () => {
    auth.connection.active = true;
    auth.connection.identityName = 'user@contoso.com';

    await command.action(logger, { options: {} });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.connected, true);
    assert.strictEqual(result.identityName, 'user@contoso.com');
  });

  it('shows disconnected status when not authenticated', async () => {
    auth.connection.active = false;

    await command.action(logger, { options: {} });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.connected, false);
  });

  it('includes all seven modules', async () => {
    auth.connection.active = true;

    await command.action(logger, { options: {} });
    const result = loggerLogSpy.firstCall.args[0];
    assert(Array.isArray(result.modules));
    assert.strictEqual(result.modules.length, 7);
    const moduleNames = result.modules.map((m: any) => m.name);
    assert(moduleNames.includes('mail'));
    assert(moduleNames.includes('calendar'));
    assert(moduleNames.includes('teams'));
    assert(moduleNames.includes('files'));
    assert(moduleNames.includes('tasks'));
    assert(moduleNames.includes('people'));
    assert(moduleNames.includes('search'));
  });

  it('each module has a positive operation count', async () => {
    auth.connection.active = true;

    await command.action(logger, { options: {} });
    const result = loggerLogSpy.firstCall.args[0];
    for (const mod of result.modules) {
      assert(typeof mod.operationCount === 'number');
      assert(mod.operationCount > 0, `Module '${mod.name}' should have operations`);
    }
  });

  it('totalOperations equals sum of module operation counts', async () => {
    auth.connection.active = true;

    await command.action(logger, { options: {} });
    const result = loggerLogSpy.firstCall.args[0];
    const sum = result.modules.reduce((acc: number, m: any) => acc + m.operationCount, 0);
    assert.strictEqual(result.totalOperations, sum);
  });

  it('does not include identityName when disconnected', async () => {
    auth.connection.active = false;

    await command.action(logger, { options: {} });
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.identityName, undefined);
  });
});
