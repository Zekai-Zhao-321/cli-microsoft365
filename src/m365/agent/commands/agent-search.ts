import { Logger } from '../../../cli/Logger.js';
import GlobalOptions from '../../../GlobalOptions.js';
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
  query?: string;
  module?: string;
}

interface OperationInfo {
  module: string;
  operation: string;
  description: string;
}

const MODULE_NAMES = ['mail', 'calendar', 'teams', 'files', 'tasks', 'people', 'search'] as const;
type ModuleName = typeof MODULE_NAMES[number];

class AgentSearchCommand extends GraphCommand {
  public get name(): string {
    return commands.SEARCH;
  }

  public get description(): string {
    return 'Discovers available agent operations across modules';
  }

  public defaultProperties(): string[] | undefined {
    return ['module', 'operation', 'description'];
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
        option: '-q, --query [query]'
      },
      {
        option: '-m, --module [module]',
        autocomplete: [...MODULE_NAMES]
      }
    );
  }

  #initValidators(): void {
    this.validators.push(
      async (args: CommandArgs) => {
        if (args.options.module && !MODULE_NAMES.includes(args.options.module as ModuleName)) {
          return `'${args.options.module}' is not a valid module. Valid modules are: ${MODULE_NAMES.join(', ')}`;
        }

        return true;
      }
    );
  }

  #initTypes(): void {
    this.types.string.push('query', 'module');
  }

  public async commandAction(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      if (this.verbose) {
        await logger.logToStderr('Building operation catalog...');
      }

      const catalog = this.buildCatalog();
      let results = catalog;

      if (args.options.module) {
        results = results.filter(op => op.module === args.options.module);
      }

      if (args.options.query) {
        const queryLower = args.options.query.toLowerCase();
        results = results.filter(op =>
          op.operation.toLowerCase().includes(queryLower) ||
          op.description.toLowerCase().includes(queryLower) ||
          op.module.toLowerCase().includes(queryLower)
        );
      }

      await logger.log(results);
    }
    catch (err: any) {
      this.handleRejectedODataJsonPromise(err);
    }
  }

  private buildCatalog(): OperationInfo[] {
    const client = new GraphClient();
    const catalog: OperationInfo[] = [];

    const modules: { name: ModuleName; instance: any }[] = [
      { name: 'mail', instance: new MailOperations(client) },
      { name: 'calendar', instance: new CalendarOperations(client) },
      { name: 'teams', instance: new TeamsOperations(client) },
      { name: 'files', instance: new FilesOperations(client) },
      { name: 'tasks', instance: new TasksOperations(client) },
      { name: 'people', instance: new PeopleOperations(client) },
      { name: 'search', instance: new SearchOperations(client) }
    ];

    for (const mod of modules) {
      const proto = Object.getPrototypeOf(mod.instance);
      const methods = Object.getOwnPropertyNames(proto)
        .filter(name => name !== 'constructor' && typeof proto[name] === 'function')
        .sort();

      for (const method of methods) {
        catalog.push({
          module: mod.name,
          operation: method,
          description: this.generateDescription(mod.name, method)
        });
      }
    }

    return catalog;
  }

  private generateDescription(module: string, operation: string): string {
    // Convert camelCase to readable description
    const words = operation.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    return `${module}: ${words}`;
  }
}

export default new AgentSearchCommand();
