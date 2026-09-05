/** What every map provider must be able to answer, regardless of vendor. */

export type LatLng = { lat: number; lng: number };

export type Place = {
  formatted: string;
  street: string | null;
  locality: string | null;
  district: string | null;
  state: string | null;
  postcode: string | null;
  /**
   * BBMP ward. Only Mappls carries anything close to this; when it is absent or
   * derived, `wardSource` says so and the UI must label it. Half-real data has
   * to declare which half.
   */
  ward: string | null;
  wardSource: 'provider' | 'boundary-lookup' | 'stand-in';
  provider: string;
};

export type MapProvider = {
  readonly name: string;
  reverse(at: LatLng): Promise<Place>;
};
