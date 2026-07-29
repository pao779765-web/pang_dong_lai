import storeDirectory from "./store-directory.json";

export type Store = {
  name: string;
  address: string;
  tuesdayOpen: boolean;
  photoUrl: string;
};

export type StoreRegion = {
  city: string;
  stores: Store[];
};

// 门店内容与页面展示分开维护；更新资料时不需要改动 React 组件。
export const storeRegions: StoreRegion[] = storeDirectory;
