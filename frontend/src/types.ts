export interface XhrEvent {
  id: number;
  method: string;
  url: string;
  status: number;
  cost: number;
  reqBody: string;
  resBody: string;
  ts: number;
}
