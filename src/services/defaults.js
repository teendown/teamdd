// Default suppliers preset data matching teamdd123.netlify.app
export const DEFAULT_SUPPLIERS = {
  sejin: {
    id: "sejin",
    label: "세진건설기계 (허강)",
    company: "세진건설기계",
    bizno: "568-23-00015",
    name: "허강",
    addr: "전북특별자치도 전주시 덕진구 추천로 269(팔복동1가)",
    tel: "010-2644-2921",
    fax: "",
    email: "lkjhg-2921@naver.com",
    bank: "우리은행 1002-753-378007 허강",
    hasStamp: true
  },
  ds_gimje: {
    id: "ds_gimje",
    label: "디에스건설기계 김제점 (경아름)",
    company: "디에스건설기계 김제점",
    bizno: "213-17-24815",
    name: "경아름",
    addr: "전북특별자치도 김제시 용지면 황도로 919,1동",
    tel: "010-4908-4703",
    fax: "063-900-3553",
    email: "areum1438@naver.com",
    bank: "하나은행 716-910596-07807 경아름",
    hasStamp: false
  }
};

export const INITIAL_SUPPLIERS_LIST = [
  {
    id: "sejin",
    code: "S0001",
    name: "세진건설기계",
    bizno: "568-23-00015",
    person: "허강",
    phone: "010-2644-2921",
    addr: "전북특별자치도 전주시 덕진구 추천로 269(팔복동1가)",
    email: "lkjhg-2921@naver.com",
    bank: "우리은행 1002-753-378007 허강",
    fax: "",
    memo: "본사",
    hasStamp: true
  },
  {
    id: "ds_gimje",
    code: "S0002",
    name: "디에스건설기계 김제점",
    bizno: "213-17-24815",
    person: "경아름",
    phone: "010-4908-4703",
    addr: "전북특별자치도 김제시 용지면 황도로 919,1동",
    email: "areum1438@naver.com",
    bank: "하나은행 716-910596-07807 경아름",
    fax: "063-900-3553",
    memo: "김제지점",
    hasStamp: false
  }
];

export const DEMO_CUSTOMERS = [
  {
    id: "demo1",
    code: "C0001",
    name: "전주건설",
    person: "김철수",
    phone: "010-1234-5678",
    addr: "전북특별자치도 전주시 덕진구 추천로 100",
    bizno: "123-45-67890",
    memo: "VIP 거래처"
  },
  {
    id: "demo2",
    code: "C0002",
    name: "김제중기",
    person: "이영희",
    phone: "010-9876-5432",
    addr: "전북특별자치도 김제시 용지면 황도로 50",
    bizno: "213-17-24815",
    memo: "정기점검 대상"
  }
];

export const DEMO_PARTS = [
  {
    id: "pdemo1",
    code: "P0001",
    name: "엔진오일 필터",
    category: "필터/오일",
    unit: "EA",
    price: 25000,
    stock: 3,
    min_stock: 5,
    memo: "저재고 경고",
    location: "A-1"
  },
  {
    id: "pdemo2",
    code: "P0002",
    name: "유압유 20L",
    category: "필터/오일",
    unit: "CAN",
    price: 85000,
    stock: 12,
    min_stock: 3,
    memo: "정품 오일",
    location: "A-2"
  },
  {
    id: "pdemo3",
    code: "P0003",
    name: "고압 유압호스",
    category: "유압부품",
    unit: "EA",
    price: 45000,
    stock: 1,
    min_stock: 4,
    memo: "긴급재고 필요",
    location: "B-3"
  },
  {
    id: "pdemo4",
    code: "P0004",
    name: "시동모터 (스타트모터)",
    category: "전기부품",
    unit: "EA",
    price: 320000,
    stock: 8,
    min_stock: 2,
    memo: "신형 전용",
    location: "C-1"
  },
  {
    id: "pdemo5",
    code: "P0005",
    name: "에어필터 엘리먼트",
    category: "필터/오일",
    unit: "EA",
    price: 18000,
    stock: 0,
    min_stock: 5,
    memo: "품절",
    location: "A-3"
  }
];

export const DOC_TYPES = ["거래명세서", "견적서", "청구서", "영수증", "발주서"];

export const PART_CATEGORIES = ["전체", "필터/오일", "유압부품", "전기부품", "엔진부품", "기타"];

export const DEMO_DOCUMENTS = [
  {
    id: "demo_doc_1",
    doc_type: "거래명세서",
    doc_no: "20260810-001",
    doc_date: "2026-08-10",
    doc_time: "10:30",
    customer_name: "전주건설",
    customer_data: DEMO_CUSTOMERS[0],
    supplier_key: "sejin",
    supplier_data: DEFAULT_SUPPLIERS.sejin,
    items: [
      { id: "1", code: "P0001", name: "엔진오일 필터", unit: "EA", qty: 4, price: 25000 },
      { id: "2", code: "P0002", name: "유압유 20L", unit: "CAN", qty: 2, price: 85000 }
    ],
    vat: 27000,
    vat_included: true,
    paid: 200000,
    remark: "현금 20만원 선수금 입금",
    created_at: "2026-08-10T10:30:00.000Z"
  },
  {
    id: "demo_doc_2",
    doc_type: "거래명세서",
    doc_no: "20260812-002",
    doc_date: "2026-08-12",
    doc_time: "14:15",
    customer_name: "김제중기",
    customer_data: DEMO_CUSTOMERS[1],
    supplier_key: "ds_gimje",
    supplier_data: DEFAULT_SUPPLIERS.ds_gimje,
    items: [
      { id: "1", code: "P0004", name: "시동모터 (스타트모터)", unit: "EA", qty: 1, price: 320000 }
    ],
    vat: 32000,
    vat_included: true,
    paid: 352000,
    remark: "계좌이체 완납 완료",
    created_at: "2026-08-12T14:15:00.000Z"
  },
  {
    id: "demo_doc_3",
    doc_type: "청구서",
    doc_no: "20260725-001",
    doc_date: "2026-07-25",
    doc_time: "16:00",
    customer_name: "전주건설",
    customer_data: DEMO_CUSTOMERS[0],
    supplier_key: "sejin",
    supplier_data: DEFAULT_SUPPLIERS.sejin,
    items: [
      { id: "1", code: "P0003", name: "고압 유압호스", unit: "EA", qty: 2, price: 45000 }
    ],
    vat: 9000,
    vat_included: true,
    paid: 0,
    remark: "7월 정기 청구 (월말 정산)",
    created_at: "2026-07-25T16:00:00.000Z"
  }
];

