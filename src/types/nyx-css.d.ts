declare module "nyx-css/js" {
  interface NyxApi {
    init(root?: Element | Document): void;
  }

  const Nyx: NyxApi;
  export default Nyx;
}
