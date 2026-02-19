export interface MaterialOption {
  _id?: string;
  name: string;
  title?: string;
  price: number;
  quantity: number;
  unit: string;
  group: string;
}

export interface Material {
  _id?: string;
  title: string;
  options: MaterialOption[];
  order?: number;
}
