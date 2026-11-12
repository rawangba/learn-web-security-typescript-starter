import { Router } from "express";
import type { Dependencies } from "../dependencies.ts";
import { getCurrentSession } from "../auth/sessions.ts";
import {
  findOrderById,
  listAllOrders,
  listOrderItems,
  listOrdersForUser,
  type Order,
  type OrderItem,
} from "../orders/index.ts";
import { listProducts, type Product } from "../products.ts";
import { findApiKey } from "../auth/apiKeys.ts";

type ProductResponse = {
  id: number;
  name: string;
  description: string;
  image_path: string;
  price_cents: number;
};

type OrderResponse = {
  id: number;
  status: Order["status"];
  total_cents: number;
  created_at: string;
};

type OrderItemResponse = {
  product_id: number;
  product_name: string;
  quantity: number;
  price_cents: number;
};

function toProductResponse(product: Product): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    image_path: product.image_path,
    price_cents: product.price_cents
  } as ProductResponse;
}

function toOrderResponse(order: Order): OrderResponse {
  return {
    id: order.id,
    status: order.status,
    total_cents: order.total_cents,
    created_at: order.created_at
  } as OrderResponse;
}

function toOrderItemResponse(orderItem: OrderItem): OrderItemResponse {
  return {
    product_id: orderItem.product_id,
    product_name: orderItem.product_name,
    quantity: orderItem.quantity,
    price_cents: orderItem.price_cents
  } as OrderItemResponse;
}

export function createApiRouter(deps: Dependencies): Router {
  const { db } = deps;
  const router = Router();

  router.get("/api/account/orders", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderResponses: OrderResponse[] = listOrdersForUser(db, current.user.id).map((x) => toOrderResponse(x));
    res.json({ orders: orderResponses});
  });

  router.get("/api/orders/:id", (req, res) => {
    const current = getCurrentSession(db, req.header("cookie"));
    if (!current) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId)) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const fullOrder = findOrderById(db, orderId);
    if (!fullOrder || fullOrder.user_id !== current.user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = toOrderResponse(fullOrder);

    const orderItemResponses: OrderItemResponse[] = listOrderItems(db, order.id).map((x) => toOrderItemResponse(x));
    res.json({ order, items: orderItemResponses });
  });

  router.get("/api/products", (_req, res) => {
    const productResponses: ProductResponse[] = listProducts(db).map((x) => toProductResponse(x));
    res.json({ products: productResponses });
  });

  router.get("/api/integrations/warehouse/orders", (_req, res) => {
    const keyName = _req.header("x-api-key") ?? "";
    const keyObject = findApiKey(db, keyName);
    
    if (!keyObject) {
      res.status(401).json({ error: "Invalid key" });
      return;
    }

    if (!keyObject.scope || !keyObject.scope.includes("orders:read")) {
      res.status(403).json({ error: "Your key does not allow this action" });
      return;
    }

    const orders = listAllOrders(db).map((order) => ({
      id: order.id,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
    }));

    res.json({
      integration: "Warehouse Fulfillment Integration",
      orders,
    });
  });

  return router;
}
