require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);


/* =========================
   TABLE MAP
========================= */

const PRODUCT_TABLES = {
    sarees: "saree_products",
    materials: "material_products",
    dresses: "readymade_products",
    lehengas: "lehenga_products",
    jewellery: "jewellery_products"
};


/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "MAGUA Backend Running"
    });

});


/* =========================
   GET PRODUCTS
========================= */

app.get("/api/products/:section", async (req, res) => {

    try {

        const section = req.params.section;

        const table = PRODUCT_TABLES[section];

        if (!table) {
            return res.status(400).json({
                success: false,
                error: "Invalid product section"
            });
        }

        const { data, error } = await supabase
            .from(table)
            .select(`
                id,
                category,
                product_name,
                original_price,
                price,
                stock,
                description,
                image1,
                image2,
                image3,
                is_active,
                created_at
            `)
            .eq("is_active", true)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            section,
            products: data || []
        });

    }
    catch (error) {

        console.error("Products API error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


app.listen(PORT, () => {
    console.log(
        `MAGUA backend running on port ${PORT}`
    );
});
