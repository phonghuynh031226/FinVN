describe('SePay Webhook & Idempotency Logic', () => {
  // Giả lập database transactions store
  const mockDbTransactions: Array<{ id: string; source: string; source_reference: string; amount: number }> = [];

  function processIncomingWebhook(payload: {
    id: number;
    referenceCode?: string;
    transferAmount: number;
    secretHeader: string;
    expectedSecret: string;
  }) {
    // 1. Xác thực Secret
    if (payload.secretHeader !== payload.expectedSecret) {
      return { status: 401, success: false, message: 'Unauthorized' };
    }

    const sourceRef = payload.referenceCode || String(payload.id);

    // 2. Chống trùng giao dịch (Idempotency check)
    const exists = mockDbTransactions.some(
      (tx) => tx.source === 'SEPAY' && tx.source_reference === sourceRef
    );

    if (exists) {
      return { status: 200, success: true, message: 'Duplicate skipped' };
    }

    // 3. Insert giao dịch
    mockDbTransactions.push({
      id: `tx-${Date.now()}`,
      source: 'SEPAY',
      source_reference: sourceRef,
      amount: payload.transferAmount,
    });

    return { status: 200, success: true, message: 'Processed' };
  }

  beforeEach(() => {
    mockDbTransactions.length = 0;
  });

  it('xác thực thành công với Secret Key hợp lệ và tạo giao dịch', () => {
    const res = processIncomingWebhook({
      id: 991,
      referenceCode: 'FT240001',
      transferAmount: 5000000,
      secretHeader: 'my-sepay-secret',
      expectedSecret: 'my-sepay-secret',
    });

    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
    expect(mockDbTransactions.length).toBe(1);
    expect(mockDbTransactions[0].source_reference).toBe('FT240001');
  });

  it('từ chối 401 nếu Secret Key không khớp', () => {
    const res = processIncomingWebhook({
      id: 992,
      referenceCode: 'FT240002',
      transferAmount: 1000000,
      secretHeader: 'wrong-secret',
      expectedSecret: 'my-sepay-secret',
    });

    expect(res.status).toBe(401);
    expect(res.success).toBe(false);
    expect(mockDbTransactions.length).toBe(0);
  });

  it('bỏ qua và không tạo giao dịch trùng lặp khi webhook gửi lại cùng mã (Idempotency)', () => {
    const payload = {
      id: 993,
      referenceCode: 'FT240003',
      transferAmount: 2000000,
      secretHeader: 'my-sepay-secret',
      expectedSecret: 'my-sepay-secret',
    };

    // Lần 1: Nhận webhook
    const firstCall = processIncomingWebhook(payload);
    expect(firstCall.status).toBe(200);
    expect(firstCall.message).toBe('Processed');
    expect(mockDbTransactions.length).toBe(1);

    // Lần 2: SePay gửi lại cùng payload
    const secondCall = processIncomingWebhook(payload);
    expect(secondCall.status).toBe(200);
    expect(secondCall.message).toBe('Duplicate skipped');
    // Số giao dịch trong DB vẫn giữ nguyên là 1, không bị cộng trùng
    expect(mockDbTransactions.length).toBe(1);
  });
});
