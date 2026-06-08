import { Op, type WhereOptions } from "sequelize";
import { PaymentOrder, User } from "@/db";
import { BadRequestError } from "@/errors/app-error";
import { config } from "@/config";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

export type AdminOrderRecord = {
  orderNo: string;
  userId: number;
  userEmail: string;
  planKey: string;
  amountUsdt: string;
  depositAddress: string;
  status: string;
  paymentStatus: string;
  txHash: string | null;
  expireAt: number;
  paidAt: number | null;
  createdAt: number;
};

function mapAdminOrder(order: PaymentOrder): AdminOrderRecord {
  const expired =
    order.status === "pending" && order.expireTime.getTime() <= Date.now();
  const paymentStatus =
    order.status === "paid"
      ? "completed"
      : order.status === "expired" || expired
        ? "expired"
        : "pending";

  return {
    orderNo: order.orderNo,
    userId: order.userId,
    userEmail: order.user?.email ?? "",
    planKey: order.planKey,
    amountUsdt: String(order.amountUsdt),
    depositAddress: order.depositAddress,
    status: expired && order.status === "pending" ? "expired" : order.status,
    paymentStatus,
    txHash: order.txHash,
    expireAt: order.expireTime.getTime(),
    paidAt: order.paidTime ? order.paidTime.getTime() : null,
    createdAt: order.createTime.getTime(),
  };
}

export class AdminBillingOrderService {
  static async list(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    query?: string;
  }): Promise<{ data: AdminOrderRecord[]; total: number; page: number; pageSize: number }> {
    assertDbReady();

    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
    const offset = (page - 1) * pageSize;
    const q = options.query?.trim();

    let where: WhereOptions = {};
    if (options.status?.trim()) {
      where = { ...where, status: options.status.trim() };
    }
    if (q) {
      where = {
        ...where,
        [Op.or]: [
          { orderNo: { [Op.like]: `%${q}%` } },
          { depositAddress: { [Op.like]: `%${q}%` } },
          { txHash: { [Op.like]: `%${q}%` } },
        ],
      };
    }

    const { rows, count } = await PaymentOrder.findAndCountAll({
      where,
      include: [{ model: User, as: "user", required: false, attributes: ["email"] }],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset,
    });

    return {
      data: rows.map(mapAdminOrder),
      total: count,
      page,
      pageSize,
    };
  }
}
