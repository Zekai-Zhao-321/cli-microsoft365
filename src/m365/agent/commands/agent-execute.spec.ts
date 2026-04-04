import assert from 'assert';
import sinon from 'sinon';
import auth from '../../../Auth.js';
import { Logger } from '../../../cli/Logger.js';
import { CommandError } from '../../../Command.js';
import { telemetry } from '../../../telemetry.js';
import { pid } from '../../../utils/pid.js';
import { session } from '../../../utils/session.js';
import { sinonUtil } from '../../../utils/sinonUtil.js';
import { cli } from '../../../cli/cli.js';
import { CommandInfo } from '../../../cli/CommandInfo.js';
import commands from '../commands.js';
import command from './agent-execute.js';
import request from '../../../request.js';

describe(commands.EXECUTE, () => {
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
    sinonUtil.restore([
      request.get,
      request.post,
      request.patch,
      request.delete
    ]);
  });

  after(() => {
    sinon.restore();
    auth.connection.active = false;
  });

  it('has correct name', () => {
    assert.strictEqual(command.name, commands.EXECUTE);
  });

  it('has a description', () => {
    assert.notStrictEqual(command.description, null);
  });

  it('fails validation if module is not valid', async () => {
    const actual = await command.validate({ options: { module: 'invalid', operation: 'listInbox' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if params is not valid JSON', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox', params: 'not-json' } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('fails validation if maxTokens is not a positive number', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox', maxTokens: -1 } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation with valid module and operation', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('passes validation with valid params JSON', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'getMessage', params: '["msg-id-123"]' } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('executes mail listInbox operation', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/me/messages') > -1) {
        return { value: [{ id: '1', subject: 'Test' }] };
      }
      throw 'Invalid request: ' + opts.url;
    });

    await command.action(logger, { options: { module: 'mail', operation: 'listInbox' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.success, true);
    assert(Array.isArray(result.data));
  });

  it('executes operation with params as object', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/me/messages/') > -1) {
        return { id: 'msg-123', subject: 'Hello' };
      }
      throw 'Invalid request: ' + opts.url;
    });

    await command.action(logger, {
      options: {
        module: 'mail',
        operation: 'getMessage',
        params: '"msg-123"'
      }
    });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.success, true);
  });

  it('throws error for non-existent operation', async () => {
    try {
      await command.action(logger, {
        options: {
          module: 'mail',
          operation: 'nonExistentOperation'
        }
      });
      assert.fail('Expected error was not thrown');
    }
    catch (err: any) {
      assert(err instanceof CommandError);
      assert(err.message.indexOf('nonExistentOperation') > -1);
    }
  });

  it('handles API error responses', async () => {
    sinon.stub(request, 'get').rejects({
      error: {
        error: {
          code: 'ErrorItemNotFound',
          message: 'The resource could not be found.'
        }
      }
    });

    try {
      await command.action(logger, {
        options: {
          module: 'mail',
          operation: 'getMessage',
          params: '"bad-id"'
        }
      });
      assert.fail('Expected error was not thrown');
    }
    catch (err: any) {
      assert(err instanceof CommandError);
    }
  });

  it('supports all module names', async () => {
    const modules = ['mail', 'calendar', 'teams', 'files', 'tasks', 'people', 'search'];
    for (const mod of modules) {
      const actual = await command.validate({ options: { module: mod, operation: 'someOp' } }, commandInfo);
      assert.strictEqual(actual, true, `Module '${mod}' should be valid`);
    }
  });

  it('passes params as array when JSON is an array', async () => {
    sinon.stub(request, 'get').callsFake(async () => {
      return { value: [] };
    });

    await command.action(logger, {
      options: {
        module: 'calendar',
        operation: 'getCalendarView',
        params: '["2024-01-01T00:00:00Z", "2024-01-02T00:00:00Z"]'
      }
    });
    assert(loggerLogSpy.calledOnce);
  });

  it('executes people listRelevantPeople and logs result', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/me/people') > -1) {
        return { value: [{ id: 'p-1', displayName: 'Alice' }] };
      }
      throw 'Invalid request: ' + opts.url;
    });

    await command.action(logger, { options: { module: 'people', operation: 'listRelevantPeople' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.success, true);
  });

  it('executes operation that returns empty array and formats as empty', async () => {
    sinon.stub(request, 'get').callsFake(async () => {
      return { value: [] };
    });

    await command.action(logger, { options: { module: 'mail', operation: 'listInbox' } });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.success, true);
    assert(Array.isArray(result.data));
    assert.strictEqual(result.data.length, 0);
  });

  it('fails validation if maxTokens is zero', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox', maxTokens: 0 } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('passes validation if maxTokens is a positive number', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox', maxTokens: 500 } }, commandInfo);
    assert.strictEqual(actual, true);
  });

  it('fails validation if maxTokens is not a number', async () => {
    const actual = await command.validate({ options: { module: 'mail', operation: 'listInbox', maxTokens: 'abc' as any } }, commandInfo);
    assert.notStrictEqual(actual, true);
  });

  it('handles operation error response with error code', async () => {
    sinon.stub(request, 'get').rejects({
      error: {
        error: {
          code: 'Forbidden',
          message: 'Access is denied.'
        }
      }
    });

    try {
      await command.action(logger, {
        options: {
          module: 'mail',
          operation: 'listInbox'
        }
      });
      assert.fail('Expected error was not thrown');
    }
    catch (err: any) {
      assert(err instanceof CommandError);
    }
  });

  it('passes params as a non-array object wrapped in array', async () => {
    sinon.stub(request, 'get').callsFake(async (opts) => {
      if ((opts.url as string).indexOf('/me/messages/') > -1) {
        return { id: 'msg-obj', subject: 'Object Param' };
      }
      throw 'Invalid request: ' + opts.url;
    });

    await command.action(logger, {
      options: {
        module: 'mail',
        operation: 'getMessage',
        params: '"msg-obj"'
      }
    });
    assert(loggerLogSpy.calledOnce);
    const result = loggerLogSpy.firstCall.args[0];
    assert.strictEqual(result.success, true);
  });

  it('throws error for unknown operation on search module', async () => {
    try {
      await command.action(logger, {
        options: {
          module: 'search',
          operation: 'nonExistentSearchOp'
        }
      });
      assert.fail('Expected error was not thrown');
    }
    catch (err: any) {
      assert(err instanceof CommandError);
      assert(err.message.indexOf('nonExistentSearchOp') > -1);
    }
  });
});
