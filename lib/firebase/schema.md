# Firestore Data Model

## Collections

### businesses/{businessId}
- `name`: string
- `ownerUid`: string
- `slotFrequencyDays`: number (default 7, customizable)
- `invoicePrefix`: string
- `createdAt`: timestamp

### users/{uid} (auth profile mapping)
- `businessId`: string
- `role`: "owner" | "manager" | "operator"
- `phone`: string
- `displayName`: string
- `active`: boolean
- `notes`: string
- `permissions`: object (e.g. `{ slots: "read" | "edit" | "none" }`)
- `createdAt`: timestamp

## Business Subcollections
All operational data is nested under each business:
`businesses/{businessId}/{collection}/{docId}`

### businesses/{businessId}/users/{userId}
- `role`: "owner" | "manager" | "operator"
- `phone`: string
- `displayName`: string
- `active`: boolean
- `notes`: string
- `permissions`: object
- `createdAt`: timestamp
- `updatedAt`: timestamp

### businesses/{businessId}/farmers/{farmerId}
- `name`: string
- `phone`: string
- `village`: string
- `creditLimit`: number
- `status`: "active" | "inactive"
- `createdAt`: timestamp

### businesses/{businessId}/slots/{slotId}
- `slotName`: string
- `startDate`: string (`YYYY-MM-DD` currently in starter)
- `hatchDate`: string (`YYYY-MM-DD` currently in starter)
- `eggCapacity`: number
- `wormCapacity`: number
- `status`: "planned" | "hatching" | "open" | "closed"
- `bookedQty`: number
- `availableQty`: number

### businesses/{businessId}/bookings/{bookingId}
- `slotId`: string
- `farmerId`: string
- `qtyBooked`: number
- `ratePerWorm`: number
- `subtotal`: number
- `bookingDate`: timestamp
- `status`: "booked" | "dispatched" | "cancelled"

### businesses/{businessId}/inventoryLedger/{entryId}
- `slotId`: string
- `type`: "egg_added" | "hatched" | "sold" | "wastage" | "adjustment"
- `qty`: number
- `note`: string
- `createdAt`: timestamp

### businesses/{businessId}/invoices/{invoiceId}
- `farmerId`: string
- `bookingIds`: string[]
- `invoiceNo`: string
- `invoiceDate`: timestamp
- `totalAmount`: number
- `paidAmount`: number
- `dueAmount`: number
- `status`: "draft" | "issued" | "partial" | "paid" | "overdue"

### businesses/{businessId}/payments/{paymentId}
- `invoiceId`: string
- `farmerId`: string
- `amount`: number
- `paymentDate`: timestamp
- `mode`: "cash" | "upi" | "bank"
- `reference`: string

### businesses/{businessId}/reports/{reportId}
- report documents/snapshots for analytics
