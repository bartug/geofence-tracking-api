export const USER_AREA_STATE_STORE = 'USER_AREA_STATE_STORE';

/** Kullanıcının "şu an hangi alanda" bilgisini tutar; TTL yok, pings kesilmesi çıktı anlamına gelmez. */
export interface UserAreaStateStore {
  getCurrentArea(userId: number): Promise<string | null>;
  setCurrentArea(userId: number, areaId: string): Promise<void>;
  clearCurrentArea(userId: number): Promise<void>;
}
