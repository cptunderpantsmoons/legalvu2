export interface Template {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  variableSchema?: string;
  filePath: string;
  isDefault: number;
  createdBy?: string;
  createdAt: number;
}
