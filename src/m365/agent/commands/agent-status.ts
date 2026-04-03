import { Logger } from '../../../cli/Logger.js';
import Command, { CommandArgs, CommandError } from '../../../Command.js';
import commands from '../commands.js';
import auth from '../../../Auth.js';
import { GraphClient } from '../../../agent/graph-client.js';
import { MailOperations } from '../../../agent/graph/mail.js';
import { CalendarOperations } from '../../../agent/graph/calendar.js';
import { TeamsOperations } from '../../../agent/graph/teams.js';
import { FilesOperations } from '../../../agent/graph/files.js';
import { TasksOperations } from '../../../agent/graph/tasks.js';
import { PeopleOperations } from '../../../agent/graph/people.js';
import { SearchOperations } from '../../../agent/graph/search.js';

interface ModuleStatus {
  name: string;
  operationCount: number;
}

interface AgentStatus {
  connected: boolean;
  identityName?: string;
  authType?: string;
  modules: ModuleStatus[];
  totalOperations: number;
}

class AgentStatusCommand extends Command {
  protected get resource(): string {
    return 'https://graph.microsoft.com';
  }

  public get name(): string {
    return commands.STATUS;
  }

  public get description(): string {
    return 'Shows the current agent status and available modules';
  }

  public async commandAction(logger: Logger): Promise<void> {
    if (this.verbose) {
      await logger.logToStderr('Checking agent status...');
    }

    const connected = auth.connection.active;
    const client = new GraphClient();

    const modules = this.getModuleStatuses(client);
    const totalOperations = modules.reduce((sum, m) => sum + m.operationCount, 0);

    const status: AgentStatus = {
      connected,
      modules,
      totalOperations
    };

    if (connected) {
      status.identityName = auth.connection.identityName;
      status.authType = auth.connection.authType !== undefined
        ? String(auth.connection.authType)
        : undefined;
    }

    await logger.log(status);
  }

  public async action(logger: Logger, args: CommandArgs): Promise<void> {
    try {
      await auth.restoreAuth();
    }
    catch (error: any) {
      throw new CommandError(error);
    }

    await this.initAction(args, logger);
    await this.commandAction(logger);
  }

  private getModuleStatuses(client: GraphClient): ModuleStatus[] {
    const moduleInstances: { name: string; instance: any }[] = [
      { name: 'mail', instance: new MailOperations(client) },
      { name: 'calendar', instance: new CalendarOperations(client) },
      { name: 'teams', instance: new TeamsOperations(client) },
      { name: 'files', instance: new FilesOperations(client) },
      { name: 'tasks', instance: new TasksOperations(client) },
      { name: 'people', instance: new PeopleOperations(client) },
      { name: 'search', instance: new SearchOperations(client) }
    ];

    return moduleInstances.map(mod => {
      const proto = Object.getPrototypeOf(mod.instance);
      const operationCount = Object.getOwnPropertyNames(proto)
        .filter(name => name !== 'constructor' && typeof proto[name] === 'function')
        .length;

      return {
        name: mod.name,
        operationCount
      };
    });
  }
}

export default new AgentStatusCommand();
