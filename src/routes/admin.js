const express = require("express");
const { getDb } = require("../db/mongo");
const { ObjectId } = require("mongodb");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Get all admins
router.get("/all", async (req, res) => {
  const db = getDb();
  const admins = await db.collection("admin").find().toArray();
  res.json({ admins });
});

// Admin: Get specific vendor details (Subscription, Profile, Stats)
router.get("/vendor-detail/:id", async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { type } = req.query; // 'album' or 'proposal'

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    let profile = null;
    let counts = { albums: 0, ads: 0 };
    let actualVendorId = id;

    if (type === "album") {
      profile = await db.collection("album_vendors").findOne({
        $or: [{ _id: new ObjectId(id) }, { vendor_id: new ObjectId(id) }],
      });
      if (profile) actualVendorId = profile.vendor_id || profile._id;
      counts.albums = await db
        .collection("albums")
        .countDocuments({ vendor_id: new ObjectId(actualVendorId) });
    } else {
      // Fetch from proposal_vendors (the admin-managed vendor registry)
      profile = await db.collection("proposal_vendors").findOne({
        $or: [{ _id: new ObjectId(id) }, { vendor_id: new ObjectId(id) }],
      });
      if (profile) {
        actualVendorId = profile._id;
        counts.ads = await db.collection("marriage_proposals").countDocuments({
          vendorId: profile._id,
        });
        if (counts.ads === 0) counts.ads = 0;
      }
    }

    const vIdMatches = [new ObjectId(id)];
    if (profile) {
      if (profile._id) vIdMatches.push(new ObjectId(profile._id));
      if (profile.vendor_id) vIdMatches.push(new ObjectId(profile.vendor_id));
    }

    // Enrich profile with vendor data if email/address is missing
    if (profile && profile.vendor_id) {
      const vendor = await db
        .collection("vendors")
        .findOne({ _id: new ObjectId(profile.vendor_id) });
      if (vendor) {
        // Merge vendor data with profile
        profile.email = profile.email || vendor.email;
        profile.city = profile.city || vendor.city;
        profile.address = profile.address || vendor.address;
        profile.phone = profile.phone || vendor.phone;
        profile.businessName = profile.businessName || vendor.businessName;
      }
    }

    // Get latest subscription with plan details
    const subscription = await db
      .collection("vendor_subscriptions")
      .aggregate([
        { $match: { vendorId: { $in: vIdMatches }, vendorType: type } },
        { $sort: { createdAt: -1 } },
        { $limit: 1 },
        {
          $addFields: {
            planObjectId: {
              $cond: {
                if: {
                  $and: [{ $ne: ["$planId", null] }, { $ne: ["$planId", ""] }],
                },
                then: { $toObjectId: "$planId" },
                else: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: "sub_plan",
            localField: "planObjectId",
            foreignField: "_id",
            as: "planDetails",
          },
        },
        { $unwind: { path: "$planDetails", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    // Fetch vendor login credentials from vendors collection
    let vendorCredentials = null;
    if (profile && profile.vendor_id) {
      const vendor = await db
        .collection("vendors")
        .findOne(
          { _id: new ObjectId(profile.vendor_id) },
          { projection: { email: 1, username: 1, plainPassword: 1 } },
        );
      if (vendor) {
        vendorCredentials = {
          email: vendor.email,
          username: vendor.username,
          plainPassword: vendor.plainPassword || null,
        };
      }
    }

    // Fetch vendor contact messages
    const messages = await db
      .collection("contacts")
      .find({
        vendor_id: { $in: vIdMatches },
      })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    res.json({
      success: true,
      profile,
      counts,
      subscription: subscription.length > 0 ? subscription[0] : null,
      vendorCredentials,
      messages,
    });
  } catch (err) {
    console.error("Vendor detail error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ...existing code...

// (Move this route to the end of the file)

// ...existing code...

// Update admin
router.put("/:id", async (req, res) => {
  const db = getDb();
  const { name, email, status, role } = req.body;
  const update = {};
  if (name) update.name = name;
  if (email) update.email = email;
  if (status) update.status = status;
  if (role) update.role = role;
  const result = await db
    .collection("admin")
    .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });
  if (result.matchedCount === 0)
    return res.status(404).json({ error: "Admin not found" });
  res.json({ message: "Admin updated" });
});

// Delete admin
router.delete("/:id", async (req, res) => {
  const db = getDb();
  const result = await db
    .collection("admin")
    .deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: "Admin not found" });
  res.json({ message: "Admin deleted" });
});

// Admin signup
router.post("/signup", async (req, res) => {
  const db = getDb();
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Name, email, and password are required" });
  }
  const existing = await db.collection("admin").findOne({ email });
  if (existing) {
    return res.status(400).json({ error: "Admin already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  // Generate id (use email or random)
  const id = "admin_" + Math.random().toString(36).substring(2, 10);
  const result = await db.collection("admin").insertOne({
    id,
    name,
    email,
    password: hashedPassword,
    createdDate: new Date(),
    lastLogin: null,
  });
  res
    .status(201)
    .json({
      message: "Admin registered successfully",
      adminId: result.insertedId,
    });
});

// Get pending vendors for approval
router.get("/approve", async (req, res) => {
  const db = getDb();

  const vendors = await db
    .collection("vendor_profiles")
    .aggregate([
      { $match: { approval_status: "pending" } },
      {
        $lookup: {
          from: "vendor_types",
          localField: "vendor_type_id",
          foreignField: "_id",
          as: "vendor_type",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: 1 } },
    ])
    .toArray();

  res.json({ vendors });
});

// Approve or reject vendor
router.post("/approve", async (req, res) => {
  const db = getDb();
  const { vendor_id, status, admin_remarks, admin_id } = req.body;

  if (!vendor_id || !status) {
    return res.status(400).json({ error: "vendor_id and status are required" });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res
      .status(400)
      .json({ error: "status must be approved or rejected" });
  }

  // Update vendor profile
  await db.collection("vendor_profiles").updateOne(
    { _id: new ObjectId(vendor_id) },
    {
      $set: {
        approval_status: status,
        admin_remarks: admin_remarks || "",
        approved_at: status === "approved" ? new Date() : null,
        updated_at: new Date(),
      },
    },
  );

  // Log the approval action
  await db.collection("admin_approval_log").insertOne({
    vendor_id: new ObjectId(vendor_id),
    admin_id: admin_id ? new ObjectId(admin_id) : null,
    action: status,
    remarks: admin_remarks || "",
    created_at: new Date(),
  });

  res.json({ message: `Vendor ${status} successfully` });
});

// Get proposal vendors
router.get("/proposal-vendors", async (req, res) => {
  const db = getDb();
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const matchFilter = {};
    if (status && status !== "all") {
      matchFilter.status = status;
    }

    if (search) {
      matchFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { whatsappNo: { $regex: search, $options: "i" } },
      ];
    }

    const totalVendors = await db
      .collection("proposal_vendors")
      .countDocuments(matchFilter);

    const vendors = await db
      .collection("proposal_vendors")
      .aggregate([
        { $match: matchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "vendor_subscriptions",
            let: { vId: "$_id", vIdField: "$vendor_id" },
            pipeline: [
              {
                $match: {
                  $and: [
                    {
                      $or: [
                        { $expr: { $eq: ["$vendorId", "$$vId"] } },
                        {
                          $expr: {
                            $and: [
                              { $ne: ["$$vIdField", null] },
                              { $eq: ["$vendorId", "$$vIdField"] },
                            ],
                          },
                        },
                      ],
                    },
                    { vendorType: "proposal" },
                  ],
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { paymentSlip: 1, planName: 1, amount: 1 } },
            ],
            as: "latestSubscription",
          },
        },
        {
          $addFields: {
            slipPhoto: {
              $cond: {
                if: {
                  $and: [
                    { $gt: [{ $size: "$latestSubscription" }, 0] },
                    { $arrayElemAt: ["$latestSubscription.paymentSlip", 0] },
                  ],
                },
                then: { $arrayElemAt: ["$latestSubscription.paymentSlip", 0] },
                else: "$slipPhoto", // Fallback to profile slipPhoto if sub has none
              },
            },
            planName: { $arrayElemAt: ["$latestSubscription.planName", 0] },
            planAmount: { $arrayElemAt: ["$latestSubscription.amount", 0] },
          },
        },
        { $project: { latestSubscription: 0 } },
      ])
      .toArray();

    res.json({
      success: true,
      vendors,
      pagination: {
        total: totalVendors,
        page,
        limit,
        pages: Math.ceil(totalVendors / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching proposal vendors:", err);
    res.status(500).json({ error: "Failed to fetch proposal vendors" });
  }
});

// Update proposal vendor status
router.patch("/proposal-vendors/:id/status", async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db
      .collection("proposal_vendors")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, updatedAt: new Date() } },
      );

    // If active, also update the latest pending subscription to active
    if (status === "active") {
      const vendor = await db
        .collection("proposal_vendors")
        .findOne({ _id: new ObjectId(id) });
      const vIdMatches = [new ObjectId(id)];
      if (vendor?.vendor_id) vIdMatches.push(new ObjectId(vendor.vendor_id));

      await db.collection("vendor_subscriptions").updateOne(
        {
          vendorId: { $in: vIdMatches },
          vendorType: "proposal",
          status: "pending",
        },
        { $set: { status: "active", updatedAt: new Date() } },
        { sort: { createdAt: -1 } },
      );
    }

    res.json({ success: true, message: `Vendor ${status}` });
  } catch (err) {
    console.error("Error updating proposal vendor:", err);
    res.status(500).json({ error: "Failed to update vendor status" });
  }
});

// Delete proposal vendor
router.delete("/proposal-vendors/:id", async (req, res) => {
  const db = getDb();
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid vendor id" });

    // Find the vendor first to get the vendor_id (link to vendors table)
    const vendor = await db
      .collection("proposal_vendors")
      .findOne({ _id: new ObjectId(id) });
    if (!vendor)
      return res.status(404).json({ error: "Proposal vendor not found" });

    const relatedVendorIds = [new ObjectId(id)];
    if (vendor.vendor_id && ObjectId.isValid(String(vendor.vendor_id))) {
      const linkedId = new ObjectId(String(vendor.vendor_id));
      if (!relatedVendorIds.some((v) => v.equals(linkedId))) {
        relatedVendorIds.push(linkedId);
      }
    }
    const relatedVendorIdStrings = relatedVendorIds.map((v) => v.toString());

    // Remove only the proposal vendor record.
    // NOTE: We do NOT delete from 'album_vendors', 'vendors', or 'albums' to prevent data loss.
    await db.collection("proposal_vendors").deleteMany({
      $or: [
        { _id: { $in: relatedVendorIds } },
        { vendor_id: { $in: relatedVendorIds } },
        { vendor_id: { $in: relatedVendorIdStrings } },
      ],
    });

    // Cascade delete ONLY proposal data for this vendor identity.
    // We leave 'albums' and shared 'vendors' accounts intact.
    await db.collection("marriage_proposals").deleteMany({
      $or: [
        { vendorId: { $in: relatedVendorIds } },
        { vendorId: { $in: relatedVendorIdStrings } },
      ],
    });

    // Legacy collection cleanup (if used).
    await db.collection("vendor_proposal").deleteMany({
      $or: [
        { vendor_id: { $in: relatedVendorIds } },
        { vendor_id: { $in: relatedVendorIdStrings } },
      ],
    });

    res.json({
      success: true,
      message:
        "Proposal vendor and proposals deleted successfully (Album vendor data preserved)",
    });
  } catch (err) {
    console.error("Error deleting proposal vendor:", err);
    res.status(500).json({ error: "Failed to delete proposal vendor" });
  }
});

// Get statistics
router.get("/stats", async (req, res) => {
  try {
    const db = getDb();

    const [
      albumsCount,
      servicesCount,
      productsCount,
      proposalsCount,
      usersCount,
      vendorsCount,
      customersCount,
      pendingVendorsCount,
    ] = await Promise.all([
      db.collection("albums").countDocuments(),
      db.collection("services").countDocuments(),
      db.collection("vendor_products").countDocuments(),
      db.collection("vendor_proposal").countDocuments(),
      db.collection("users").countDocuments(),
      db.collection("vendor_profiles").countDocuments(),
      db.collection("customers").countDocuments(),
      db
        .collection("vendor_profiles")
        .countDocuments({ approval_status: "pending" }),
    ]);

    res.json({
      stats: {
        albums: albumsCount,
        services: servicesCount,
        products: productsCount,
        proposals: proposalsCount,
        users: usersCount,
        vendors: vendorsCount,
        customers: customersCount,
        pendingVendors: pendingVendorsCount,
      },
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch admin stats", details: err.message });
  }
});

// Cleanup expired profiles
router.get("/cleanup/expired-profiles", async (req, res) => {
  const db = getDb();

  const result = await db.collection("vendor_profiles").deleteMany({
    expire_date: { $lt: new Date() },
  });

  res.json({
    message: "Expired profiles cleaned up",
    deletedCount: result.deletedCount,
  });
});

// Admin login

// ===== SERVICE CATEGORIES ROUTES =====

// Create service category
router.post("/service-categories", async (req, res) => {
  try {
    const db = getDb();
    const { name, description, imageUrl, status } = req.body;
    if (!name || !description) {
      return res
        .status(400)
        .json({ error: "name and description are required" });
    }
    const category = {
      name,
      description,
      imageUrl: imageUrl || "",
      status: status || "active",
      createdAt: new Date(),
    };
    const result = await db
      .collection("service_categories")
      .insertOne(category);
    res.status(201).json({
      message: "Service category created successfully",
      category: { ...category, _id: result.insertedId },
    });
  } catch (err) {
    console.error("Error creating service category:", err);
    res
      .status(500)
      .json({
        error: "Failed to create service category",
        details: err.message,
      });
  }
});

// Get all service categories
router.get("/service-categories", async (req, res) => {
  try {
    const db = getDb();
    const categories = await db
      .collection("service_categories")
      .find()
      .toArray();
    res.json({ categories });
  } catch (err) {
    console.error("Error fetching service categories:", err);
    res
      .status(500)
      .json({
        error: "Failed to fetch service categories",
        details: err.message,
      });
  }
});

// Get single service category by ID
router.get("/service-categories/:id", async (req, res) => {
  const db = getDb();
  try {
    const category = await db
      .collection("service_categories")
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!category) {
      return res.status(404).json({ error: "Service category not found" });
    }
    res.json(category);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// Update service category
router.put("/service-categories/:id", async (req, res) => {
  const db = getDb();
  const { name, description, imageUrl, status } = req.body;
  try {
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();
    const result = await db
      .collection("service_categories")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Service category not found" });
    }
    res.json({
      message: "Service category updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// Delete service category
router.delete("/service-categories/:id", async (req, res) => {
  const db = getDb();
  try {
    const result = await db
      .collection("service_categories")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Service category not found" });
    }
    res.json({
      message: "Service category deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

// Admin login
router.post("/login", async (req, res) => {
  const db = getDb();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const admin = await db.collection("admin").findOne({ email });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await db
      .collection("admin")
      .updateOne({ _id: admin._id }, { $set: { lastLogin: new Date() } });

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get single admin by id (MOVED TO END to avoid route conflicts)
router.get("/:id", async (req, res) => {
  const db = getDb();
  const admin = await db
    .collection("admin")
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json({ admin });
});

// ════════════════════════════════════════════════════════════════
// PHOTOGRAPHER MANAGEMENT
// ════════════════════════════════════════════════════════════════

// GET /admin/photographers
// List all photographers with search, filter by status, pagination
router.get("/photographers", async (req, res) => {
  const db = getDb();
  try {
    const { status, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const total = await db.collection("photographers").countDocuments(filter);

    const photographers = await db
      .collection("photographers")
      .find(filter, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // For each photographer attach album count
    const enriched = await Promise.all(
      photographers.map(async (p) => {
        const albumCount = await db
          .collection("albums")
          .countDocuments({ photographer_id: p._id });
        return { ...p, albumCount };
      })
    );

    res.json({
      success: true,
      photographers: enriched,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching photographers:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/photographers/pending
// List only pending photographers waiting for approval
router.get("/photographers/pending", async (req, res) => {
  const db = getDb();
  try {
    const photographers = await db
      .collection("photographers")
      .find({ status: "pending" }, { projection: { password: 0 } })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({ success: true, photographers, total: photographers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/photographers/:id
// Get full details of one photographer including their albums and couple access stats
router.get("/photographers/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid photographer ID" });
    }

    const photographer = await db
      .collection("photographers")
      .findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { password: 0 } }
      );

    if (!photographer) {
      return res.status(404).json({ error: "Photographer not found" });
    }

    // Get all albums by this photographer
    const albums = await db
      .collection("albums")
      .find(
        { photographer_id: new ObjectId(req.params.id) },
        {
          projection: {
            title: 1,
            description: 1,
            shareEnabled: 1,
            coupleAccess: 1,
            created_at: 1,
            updated_at: 1,
          },
        }
      )
      .sort({ created_at: -1 })
      .toArray();

    // Calculate stats
    const totalAlbums = albums.length;
    const sharedAlbums = albums.filter((a) => a.shareEnabled).length;
    const totalCouplesGivenAccess = albums.reduce(
      (sum, a) => sum + (a.coupleAccess ? a.coupleAccess.length : 0),
      0
    );

    res.json({
      success: true,
      photographer,
      albums,
      stats: {
        totalAlbums,
        sharedAlbums,
        totalCouplesGivenAccess,
      },
    });
  } catch (err) {
    console.error("Error fetching photographer detail:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/photographers/:id/status
// Approve, suspend or set back to pending
router.patch("/photographers/:id/status", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid photographer ID" });
    }

    const { status } = req.body;
    if (!["active", "suspended", "pending"].includes(status)) {
      return res
        .status(400)
        .json({ error: "status must be active, suspended or pending" });
    }

    const result = await db.collection("photographers").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Photographer not found" });
    }

    res.json({
      success: true,
      message: `Photographer status set to ${status}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/photographers/:id
// Edit photographer details — name, phone, bio
router.put("/photographers/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid photographer ID" });
    }

    const { name, phone, bio, email } = req.body;
    const updateData = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (bio) updateData.bio = bio;

    // If email is being changed check it is not already taken
    if (email) {
      const existing = await db
        .collection("photographers")
        .findOne({ email, _id: { $ne: new ObjectId(req.params.id) } });
      if (existing) {
        return res.status(400).json({ error: "Email already in use" });
      }
      updateData.email = email;
    }

    const result = await db.collection("photographers").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Photographer not found" });
    }

    res.json({ success: true, message: "Photographer updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/photographers/:id/reset-password
// Admin resets a photographer's password
router.post("/photographers/:id/reset-password", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid photographer ID" });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "newPassword must be at least 6 characters" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    const result = await db.collection("photographers").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { password: hashed, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Photographer not found" });
    }

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/photographers/:id
// Delete photographer and all their albums
router.delete("/photographers/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid photographer ID" });
    }

    const photographer = await db
      .collection("photographers")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!photographer) {
      return res.status(404).json({ error: "Photographer not found" });
    }

    // Delete all albums belonging to this photographer
    const albumsResult = await db
      .collection("albums")
      .deleteMany({ photographer_id: new ObjectId(req.params.id) });

    // Delete the photographer
    await db
      .collection("photographers")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({
      success: true,
      message: "Photographer and their albums deleted",
      albumsDeleted: albumsResult.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════════════════════════════

// GET /admin/users
// List all users with search and pagination
router.get("/users", async (req, res) => {
  const db = getDb();
  try {
    const { search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await db.collection("users").countDocuments(filter);

    const users = await db
      .collection("users")
      .find(filter, { projection: { password: 0, tempPassword: 0 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/users/:id
// Get one user with all albums they have access to
router.get("/users/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.params.id) },
        { projection: { password: 0, tempPassword: 0 } }
      );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find albums this user has access to
    const albums = await db
      .collection("albums")
      .find(
        { "coupleAccess.email": user.email },
        {
          projection: {
            title: 1,
            shareEnabled: 1,
            shareToken: 1,
            created_at: 1,
            photographer_id: 1,
          },
        }
      )
      .toArray();

    res.json({
      success: true,
      user,
      albums,
      totalAlbumsAccess: albums.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/users/:id
// Delete a user account
router.delete("/users/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove this user from coupleAccess in all albums
    await db.collection("albums").updateMany(
      { "coupleAccess.email": user.email },
      { $pull: { coupleAccess: { email: user.email } } }
    );

    await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// ALBUM MANAGEMENT (admin view)
// ════════════════════════════════════════════════════════════════

// GET /admin/albums
// List all albums across all photographers with search and pagination
router.get("/albums", async (req, res) => {
  const db = getDb();
  try {
    const { search, photographerId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (photographerId && ObjectId.isValid(photographerId)) {
      filter.photographer_id = new ObjectId(photographerId);
    }
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const total = await db.collection("albums").countDocuments(filter);

    const albums = await db
      .collection("albums")
      .aggregate([
        { $match: filter },
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "photographers",
            localField: "photographer_id",
            foreignField: "_id",
            as: "photographer",
          },
        },
        {
          $unwind: {
            path: "$photographer",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            title: 1,
            description: 1,
            shareEnabled: 1,
            shareToken: 1,
            created_at: 1,
            coupleAccessCount: { $size: { $ifNull: ["$coupleAccess", []] } },
            "photographer._id": 1,
            "photographer.name": 1,
            "photographer.email": 1,
          },
        },
      ])
      .toArray();

    res.json({
      success: true,
      albums,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/albums/:id
// Admin force delete any album
router.delete("/albums/:id", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid album ID" });
    }

    const result = await db
      .collection("albums")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    res.json({ success: true, message: "Album deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/albums/:id/disable-sharing
// Admin force disable sharing on any album
router.patch("/albums/:id/disable-sharing", async (req, res) => {
  const db = getDb();
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid album ID" });
    }

    await db
      .collection("albums")
      .updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { shareEnabled: false, updated_at: new Date() } }
      );

    res.json({ success: true, message: "Sharing disabled for this album" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════
// DASHBOARD STATS (updated to include new collections)
// ════════════════════════════════════════════════════════════════

// GET /admin/dashboard-stats
// Full dashboard numbers for the admin panel home screen
router.get("/dashboard-stats", async (req, res) => {
  const db = getDb();
  try {
    const [
      totalPhotographers,
      pendingPhotographers,
      activePhotographers,
      suspendedPhotographers,
      totalAlbums,
      sharedAlbums,
      totalUsers,
      totalServices,
      totalProducts,
      totalProposals,
      totalVendors,
      pendingVendors,
    ] = await Promise.all([
      db.collection("photographers").countDocuments(),
      db.collection("photographers").countDocuments({ status: "pending" }),
      db.collection("photographers").countDocuments({ status: "active" }),
      db.collection("photographers").countDocuments({ status: "suspended" }),
      db.collection("albums").countDocuments(),
      db.collection("albums").countDocuments({ shareEnabled: true }),
      db.collection("users").countDocuments(),
      db.collection("services").countDocuments(),
      db.collection("vendor_products").countDocuments(),
      db.collection("vendor_proposal").countDocuments(),
      db.collection("vendor_profiles").countDocuments(),
      db
        .collection("vendor_profiles")
        .countDocuments({ approval_status: "pending" }),
    ]);

    res.json({
      success: true,
      stats: {
        photographers: {
          total: totalPhotographers,
          pending: pendingPhotographers,
          active: activePhotographers,
          suspended: suspendedPhotographers,
        },
        albums: {
          total: totalAlbums,
          shared: sharedAlbums,
        },
        users: {
          total: totalUsers,
        },
        legacy: {
          services: totalServices,
          products: totalProducts,
          proposals: totalProposals,
          vendors: totalVendors,
          pendingVendors: pendingVendors,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single admin by id — MUST stay last to avoid catching other routes
router.get("/:id", async (req, res) => {
  const db = getDb();
  const admin = await db
    .collection("admin")
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json({ admin });
});

module.exports = router;
