const nodemailer = require("nodemailer")

module.exports = async (req, res) => {
    if(req.method != "POST"){
        return res.status(405).json({
            success : false,
            message : "Method not allowed"
        });
    }

    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || authHeader != `Bearer ${process.env.MAIL_SERVICE_SECRET}`){
            return res.status(401).json({
                success : false,
                message : "unauthorized"
            })
        }

        const {email, otp} = req.body;
        if(!email || !otp){
            return res.status(400).json({
                success : false,
                message : "Email and otp both required!"
            })
        }

        const transporter = nodemailer.createTransport({
            "host" : process.env.MAIL_HOST,
            "port" : process.env.MAIL_PORT,
            auth : {
                user : process.env.MAIL_USERNAME,
                pass : process.env.MAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: `"Your App" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Your OTP",

            text: `Your OTP is ${otp}. It will expire soon.`,

            html: `
                <div style="font-family: Arial, sans-serif;">
                    <h2>Email Verification</h2>

                    <p>Your OTP is:</p>

                    <h1>${otp}</h1>

                    <p>This OTP will expire soon.</p>
                </div>
            `
        });
        return res.status(200).json({
            success : true,
            message : "Otp email sent"
        })
        
    }catch(error){
        console.error("EMAIL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send email",
            error: error.message
        }); 
    }
}