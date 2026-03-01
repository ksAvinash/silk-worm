# Firestore Data Model

## Collections

### businesses/{businessId}
- `name`: string
- `ownerUid`: string
- `slotFrequencyDays`: number (default 7, customizable)
- `invoicePrefix`: string
- `createdAt`: timestamp

### users/{uid}
- `businessId`: string
- `role`: "owner" | "manager" | "operator"
- `phone`: string
- `displayName`: string
- `active`: boolean
- `notes`: string
- `permissions`: object (e.g. `{ slots: "read" | "edit" | "none" }`)
- `createdAt`: timestamp

### farmers/{farmerId}
- `businessId`: string
- `name`: string
- `phone`: string
- `village`: string
- `creditLimit`: number
- `status`: "active" | "inactive"
- `createdAt`: timestamp

### slots/{slotId}
- `businessId`: string
- `slotName`: string
- `startDate`: string (`YYYY-MM-DD` currently in starter)
- `hatchDate`: string (`YYYY-MM-DD` currently in starter)
- `eggCapacity`: number
- `wormCapacity`: number
- `status`: "planned" | "hatching" | "open" | "closed"
- `bookedQty`: number
- `availableQty`: number

### bookings/{bookingId}
- `businessId`: string
- `slotId`: string
- `farmerId`: string
- `qtyBooked`: number
- `ratePerWorm`: number
- `subtotal`: number
- `bookingDate`: timestamp
- `status`: "booked" | "dispatched" | "cancelled"

### inventoryLedger/{entryId}
- `businessId`: string
- `slotId`: string
- `type`: "egg_added" | "hatched" | "sold" | "wastage" | "adjustment"
- `qty`: number
- `note`: string
- `createdAt`: timestamp

### invoices/{invoiceId}
- `businessId`: string
- `farmerId`: string
- `bookingIds`: string[]
- `invoiceNo`: string
- `invoiceDate`: timestamp
- `totalAmount`: number
- `paidAmount`: number
- `dueAmount`: number
- `status`: "draft" | "issued" | "partial" | "paid" | "overdue"

### payments/{paymentId}
- `businessId`: string
- `invoiceId`: string
- `farmerId`: string
- `amount`: number
- `paymentDate`: timestamp
- `mode`: "cash" | "upi" | "bank"
- `reference`: string
