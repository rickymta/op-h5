-- Lich su thu cua cong GM doc admin_audit theo (action, target): "nhan vat nay da nhan
-- nhung thu nao". Hai chi muc co san (created_at; admin_id, created_at) khong giup gi cho
-- phep loc do — bang lon len la moi lan mo trang gui thu quet ca bang.
ALTER TABLE admin_audit ADD KEY idx_audit_action_target (action, target, id);
