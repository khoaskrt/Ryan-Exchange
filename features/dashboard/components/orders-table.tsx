import type { Order } from "@/lib/types/market";

type OrdersTableProps = {
  orders: Order[];
};

function getStatusClass(status: Order["status"]) {
  if (status === "Filled") return "bg-emerald-500/10 text-emerald-300";
  if (status === "Open") return "bg-amber-500/10 text-amber-300";
  return "bg-sky-500/10 text-sky-300";
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="border-b border-white/8 px-5 py-4">
        <h2 className="text-lg font-semibold">Recent Orders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Order ID</th>
              <th className="px-5 py-3 font-medium">Pair</th>
              <th className="px-5 py-3 font-medium">Side</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-white/6">
                <td className="px-5 py-3 font-mono text-xs text-[var(--text-muted)]">{order.id}</td>
                <td className="px-5 py-3 font-medium">{order.pair}</td>
                <td className={[
                  "px-5 py-3 font-medium",
                  order.side === "Buy" ? "text-emerald-300" : "text-rose-300",
                ].join(" ")}>
                  {order.side}
                </td>
                <td className="px-5 py-3">{order.amount}</td>
                <td className="px-5 py-3">{order.price}</td>
                <td className="px-5 py-3">
                  <span className={["rounded-full px-2 py-1 text-xs font-medium", getStatusClass(order.status)].join(" ")}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-[var(--text-muted)]">{order.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
