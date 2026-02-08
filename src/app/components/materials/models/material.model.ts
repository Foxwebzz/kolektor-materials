export interface MaterialOption {
  name: string;
  title?: string;
  price: number;
  quantity: number;
  unit: string;
  group: string;
}

export interface Material {
  title: string;
  options: MaterialOption[];
}
