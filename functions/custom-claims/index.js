const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

const VALID_ROLES = new Set(["owner", "manager", "operator"]);

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (VALID_ROLES.has(role)) {
    return role;
  }

  return "";
}

exports.syncBusinessRoleClaim = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const uid = request.auth.uid;
  const userProfileRef = admin.firestore().collection("users").doc(uid);
  const userProfileSnap = await userProfileRef.get();

  if (!userProfileSnap.exists) {
    throw new HttpsError("permission-denied", "User profile not found.");
  }

  const userProfile = userProfileSnap.data() || {};
  const businessId = String(userProfile.businessId || "").trim();
  const role = normalizeRole(userProfile.role);

  if (!businessId) {
    throw new HttpsError("permission-denied", "User business is missing.");
  }

  if (!role) {
    throw new HttpsError("permission-denied", "User role is invalid.");
  }

  const userRecord = await admin.auth().getUser(uid);
  const currentClaims = userRecord.customClaims || {};

  if (currentClaims.businessId !== businessId || currentClaims.role !== role) {
    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      businessId,
      role,
    });
  }

  return { ok: true, businessId, role };
});
