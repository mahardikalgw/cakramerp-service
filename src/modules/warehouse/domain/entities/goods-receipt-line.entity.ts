export class GoodsReceiptLine {
  constructor(
    public readonly props: {
      id?: string;
      goodsReceiptId: string;
      itemId: string;
      itemName: string;
      poQty: number;
      receivedQty: number;
      discrepancyQty: number;
      uom: string;
      remarks?: string;
    },
  ) {}
  get id() {
    return this.props.id;
  }
  get goodsReceiptId() {
    return this.props.goodsReceiptId;
  }
  get itemId() {
    return this.props.itemId;
  }
  get itemName() {
    return this.props.itemName;
  }
  get poQty() {
    return this.props.poQty;
  }
  get receivedQty() {
    return this.props.receivedQty;
  }
  get discrepancyQty() {
    return this.props.discrepancyQty;
  }
  get uom() {
    return this.props.uom;
  }
  get remarks() {
    return this.props.remarks;
  }
}
