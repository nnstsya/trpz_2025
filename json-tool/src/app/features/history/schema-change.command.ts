import { ICommand } from '../../core/models/command.model';
import { JsonSchema } from '../../core/models/json-schema.model';

export class SchemaChangeCommand implements ICommand {
  constructor(
    private callback: (schema: JsonSchema) => void,
    private previousState: JsonSchema,
    private newState: JsonSchema
  ) {}

  execute(): void {
    this.callback(this.newState);
  }

  undo(): void {
    this.callback(this.previousState);
  }
}
