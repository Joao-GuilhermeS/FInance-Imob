export class FieldErrors extends Error {
  fields: Record<string, string>
  constructor(fields: Record<string, string>) {
    super('Confira os campos indicados antes de salvar.')
    this.fields = fields
  }
}
