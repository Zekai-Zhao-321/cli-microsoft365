import { Logger } from '../../../cli/Logger.js';
import GlobalOptions from '../../../GlobalOptions.js';
import { CommandError } from '../../../Command.js';
import GraphCommand from '../../base/GraphCommand.js';
import commands from '../commands.js';
import { GraphClient } from '../../../agent/graph-client.js';
import { MailOperations } from '../../../agent/graph/mail.js';
import { CalendarOperations } from '../../../agent/graph/calendar.js';
import { TeamsOperations } from '../../../agent/graph/teams.js';
import { FilesOperations } from '../../../agent/graph/files.js';
import { TasksOperations } from '../../../agent/graph/tasks.js';
import { PeopleOperations } from '../../../agent/graph/people.js';
import { SearchOperations } from '../../../agent/graph/search.js';

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  module: string;
  operation: string;
  params?: string;
  maxTokens?: number;
}

const MODULE_NAMES = ['mail', 'calendar', 'teams', 'files', 'tasks', 'people', 'search'] as const;
type ModuleName = typeof MODULE_NAMES[number];

class AgentExecuteCommand extends GraphCommand {
  public get name(): string {
    return commands.EXECUTE;
  }

  public get description(): string {
    return 'Executes an agent operation on a specified module';
  }

  constructor() {
    super();

    this.#initOptions();
    this.#initValidators();
    this.#initTypes();
  }

  #initOptions(): void {
    this.options.unshift(
      {
        option: '-m, --module <module>',
        autocomplete: [...MODULE_NAMES]
      },
      {
        option: '-o, --operation <operation>'
      },
      {
        option: '-p, --params [params]'
      },
      {
        option: '--maxTokens [maxTokens]'
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        if (!MODULE_NAMES.includes(args.options.module as ModuleName)) {
          return `'${args.options.module}' is not a valid module. Valid modules are: ${MODULE_NAMES.join(', ')}`;
        }

        if (args.options.params) {
          try {
            JSON.parse(args.options.params);
          }
          catch {
            return `'params' must be a valid JSON string`;
          }
        }

        if (args.options.maxTokens !== undefined && (isNaN(Number(args.options.maxTokens)) || Number(args.options.maxTokens) <= 0)) {
          return `'maxTokens' must be a positive number`;
        }

        return true;
      }
    );
  }

  #initTypes(): void {
    this.types.string.push('module', 'operation', 'params');
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      const client = new GraphClient();

      const opsInstance = this.getOperationsInstance(args.options.module as ModuleName, client);
      const operation = args.options.operation;

      if (typeof (opsInstance as any)[operation] !== 'function') {
        throw new CommandError(`Operation '${operation}' not found on module '${args.options.module}'`);
      }

      let parsedParams: any[] = [];
      if (args.options.params) {
        const paramsObj = JSON.parse(args.options.params);
        parsedParams = Array.isArray(paramsObj) ? paramsObj : [paramsObj];
      }

      if (this.verbose) {
        await logger.logToStderr(`Executing ${args.options.module}.${operation}...`);
      }

      const result = await (opsInstance as any)[operation](...parsedParams);

      if (!result.success && result.error) {
        throw new CommandError(result.error.message);
      }

      await logger.log(result);
    }
    catch (err: any) {
      if (err instanceof CommandError) {
        throw err;
      }
      this.handleRejectedODataJsonPromise(err);
    }
  }

  private getOperationsInstance(module: ModuleName, client: GraphClient): any {
    switch (module) {
      case 'mail':
        return new MailOperations(client);
      case 'calendar':
        return new CalendarOperations(client);
      case 'teams':
        return new TeamsOperations(client);
      case 'files':
        return new FilesOperations(client);
      case 'tasks':
        return new TasksOperations(client);
      case 'people':
        return new PeopleOperations(client);
      case 'search':
        return new SearchOperations(client);
      default:
        throw new CommandError(`Unknown module: ${module}`);
    }
  }
}

export default new AgentExecuteCommand();
