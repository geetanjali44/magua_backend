require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json({
    limit: "10mb"
}));

const PORT = process.env.PORT || 3000;


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    process.env.SUPABASE_URL;

const SUPABASE_SECRET_KEY =
    process.env.SUPABASE_SECRET_KEY;

const ADMIN_EMAIL =
    String(process.env.ADMIN_EMAIL || "")
        .trim()
        .toLowerCase();


if(!SUPABASE_URL || !SUPABASE_SECRET_KEY){

    console.error(
        "Missing SUPABASE_URL or SUPABASE_SECRET_KEY"
    );

    process.exit(1);
}


const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY,
    {
        auth:{
            persistSession:false,
            autoRefreshToken:false
        }
    }
);


/* =========================================
   TABLE MAP
========================================= */

const PRODUCT_TABLES = {

    sarees:
        "saree_products",

    materials:
        "material_products",

    dresses:
        "readymade_products",

    lehengas:
        "lehenga_products",

    jewellery:
        "jewellery_products"

};


/* =========================================
   GET TABLE
========================================= */

function getProductTable(section){

    return PRODUCT_TABLES[
        String(section || "")
            .trim()
            .toLowerCase()
    ] || null;

}


/* =========================================
   HEALTH CHECK
========================================= */

app.get("/", (req,res) => {

    res.json({
        success:true,
        message:"MAGUA Backend Running"
    });

});


/* =========================================
   VERIFY ADMIN
========================================= */

async function verifyAdmin(req,res,next){

    try{

        const authorization =
            req.headers.authorization || "";

        if(
            !authorization.startsWith(
                "Bearer "
            )
        ){

            return res.status(401).json({
                success:false,
                error:"Admin login required"
            });

        }


        const token =
            authorization
                .slice(7)
                .trim();


        if(!token){

            return res.status(401).json({
                success:false,
                error:"Invalid login token"
            });

        }


        const {
            data,
            error
        } =
        await supabase.auth.getUser(token);


        if(
            error ||
            !data ||
            !data.user
        ){

            return res.status(401).json({
                success:false,
                error:"Invalid or expired admin session"
            });

        }


        const userEmail =
            String(
                data.user.email || ""
            )
            .trim()
            .toLowerCase();


        if(
            !ADMIN_EMAIL ||
            userEmail !== ADMIN_EMAIL
        ){

            return res.status(403).json({
                success:false,
                error:"Admin access denied"
            });

        }


        req.adminUser =
            data.user;


        next();

    }
    catch(error){

        console.error(
            "Admin verification error:",
            error
        );


        res.status(500).json({
            success:false,
            error:"Unable to verify admin"
        });

    }

}


/* =========================================
   CUSTOMER - GET ACTIVE PRODUCTS
========================================= */

app.get(
    "/api/products/:section",
    async (req,res) => {

        try{

            const section =
                String(
                    req.params.section || ""
                )
                .trim()
                .toLowerCase();


            const table =
                getProductTable(section);


            if(!table){

                return res.status(400).json({
                    success:false,
                    error:"Invalid product section"
                });

            }


            const {
                data,
                error
            } =
            await supabase
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
                .eq(
                    "is_active",
                    true
                )
                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                );


            if(error){

                throw error;

            }


            res.json({
                success:true,
                section:section,
                products:data || []
            });

        }
        catch(error){

            console.error(
                "Products API error:",
                error
            );


            res.status(500).json({
                success:false,
                error:error.message
            });

        }

    }
);


/* =========================================
   ADMIN - GET ALL PRODUCTS
========================================= */

app.get(
    "/api/admin/products/:section",
    verifyAdmin,
    async (req,res) => {

        try{

            const section =
                String(
                    req.params.section || ""
                )
                .trim()
                .toLowerCase();


            const table =
                getProductTable(section);


            if(!table){

                return res.status(400).json({
                    success:false,
                    error:"Invalid product section"
                });

            }


            const {
                data,
                error
            } =
            await supabase
                .from(table)
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending:false
                    }
                );


            if(error){

                throw error;

            }


            res.json({
                success:true,
                section:section,
                products:data || []
            });

        }
        catch(error){

            console.error(
                "Admin products load error:",
                error
            );


            res.status(500).json({
                success:false,
                error:error.message
            });

        }

    }
);


/* =========================================
   ADMIN - ADD PRODUCT
========================================= */

app.post(
    "/api/admin/products/:section",
    verifyAdmin,
    async (req,res) => {

        try{

            const section =
                String(
                    req.params.section || ""
                )
                .trim()
                .toLowerCase();


            const table =
                getProductTable(section);


            if(!table){

                return res.status(400).json({
                    success:false,
                    error:"Invalid product section"
                });

            }


            const body =
                req.body || {};


            const category =
                String(
                    body.category || ""
                ).trim();


            const productName =
                String(
                    body.product_name || ""
                ).trim();


            if(
                !category ||
                !productName
            ){

                return res.status(400).json({
                    success:false,
                    error:
                        "Category and product name are required"
                });

            }


            const productData = {

                category:
                    category,

                product_name:
                    productName,

                original_price:
                    body.original_price ??
                    null,

                price:
                    body.price ?? 0,

                stock:
                    body.stock ?? 1,

                description:
                    body.description ||
                    null,

                image1:
                    body.image1 ||
                    null,

                image2:
                    body.image2 ||
                    null,

                image3:
                    body.image3 ||
                    null,

                is_active:
                    body.is_active !== false

            };


            const {
                data,
                error
            } =
            await supabase
                .from(table)
                .insert(productData)
                .select()
                .single();


            if(error){

                throw error;

            }


            res.status(201).json({
                success:true,
                message:
                    "Product added successfully",
                product:data
            });

        }
        catch(error){

            console.error(
                "Add product error:",
                error
            );


            res.status(500).json({
                success:false,
                error:error.message
            });

        }

    }
);


/* =========================================
   ADMIN - UPDATE PRODUCT
========================================= */

app.put(
    "/api/admin/products/:section/:id",
    verifyAdmin,
    async (req,res) => {

        try{

            const section =
                String(
                    req.params.section || ""
                )
                .trim()
                .toLowerCase();


            const table =
                getProductTable(section);


            if(!table){

                return res.status(400).json({
                    success:false,
                    error:"Invalid product section"
                });

            }


            const productId =
                req.params.id;


            if(!productId){

                return res.status(400).json({
                    success:false,
                    error:"Product ID required"
                });

            }


            const body =
                req.body || {};


            /*
             Only allow product fields.
             ID / created_at cannot be changed.
            */

            const updateData = {};


            if(
                body.category !== undefined
            ){

                updateData.category =
                    String(
                        body.category
                    ).trim();

            }


            if(
                body.product_name !== undefined
            ){

                updateData.product_name =
                    String(
                        body.product_name
                    ).trim();

            }


            if(
                body.original_price !== undefined
            ){

                updateData.original_price =
                    body.original_price;

            }


            if(
                body.price !== undefined
            ){

                updateData.price =
                    body.price;

            }


            if(
                body.stock !== undefined
            ){

                updateData.stock =
                    body.stock;

            }


            if(
                body.description !== undefined
            ){

                updateData.description =
                    body.description ||
                    null;

            }


            if(
                body.image1 !== undefined
            ){

                updateData.image1 =
                    body.image1 ||
                    null;

            }


            if(
                body.image2 !== undefined
            ){

                updateData.image2 =
                    body.image2 ||
                    null;

            }


            if(
                body.image3 !== undefined
            ){

                updateData.image3 =
                    body.image3 ||
                    null;

            }


            if(
                body.is_active !== undefined
            ){

                updateData.is_active =
                    Boolean(
                        body.is_active
                    );

            }


            if(
                Object.keys(
                    updateData
                ).length === 0
            ){

                return res.status(400).json({
                    success:false,
                    error:"Nothing to update"
                });

            }


            const {
                data,
                error
            } =
            await supabase
                .from(table)
                .update(updateData)
                .eq(
                    "id",
                    productId
                )
                .select()
                .single();


            if(error){

                throw error;

            }


            res.json({
                success:true,
                message:
                    "Product updated successfully",
                product:data
            });

        }
        catch(error){

            console.error(
                "Update product error:",
                error
            );


            res.status(500).json({
                success:false,
                error:error.message
            });

        }

    }
);


/* =========================================
   ADMIN - DELETE PRODUCT
========================================= */

app.delete(
    "/api/admin/products/:section/:id",
    verifyAdmin,
    async (req,res) => {

        try{

            const section =
                String(
                    req.params.section || ""
                )
                .trim()
                .toLowerCase();


            const table =
                getProductTable(section);


            if(!table){

                return res.status(400).json({
                    success:false,
                    error:"Invalid product section"
                });

            }


            const productId =
                req.params.id;


            if(!productId){

                return res.status(400).json({
                    success:false,
                    error:"Product ID required"
                });

            }


            const {
                data,
                error
            } =
            await supabase
                .from(table)
                .delete()
                .eq(
                    "id",
                    productId
                )
                .select();


            if(error){

                throw error;

            }


            res.json({
                success:true,
                message:
                    "Product deleted successfully",
                product:
                    data?.[0] || null
            });

        }
        catch(error){

            console.error(
                "Delete product error:",
                error
            );


            res.status(500).json({
                success:false,
                error:error.message
            });

        }

    }
);


/* =========================================
   404
========================================= */

app.use((req,res) => {

    res.status(404).json({
        success:false,
        error:"API route not found"
    });

});


/* =========================================
   START SERVER
========================================= */

app.listen(PORT, () => {

    console.log(
        `MAGUA backend running on port ${PORT}`
    );

});
