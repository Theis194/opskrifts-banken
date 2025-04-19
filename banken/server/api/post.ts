import { generateRefreshToken, generateToken } from "../../jwt/jwt.ts";
import { getUserByEmail, createUser } from "../../db/db_user.ts";
import { Role } from "../../acm/permission.ts";
import { Http } from "../wrapper.ts";
import { readReviews } from "../../db/db_reviews.ts";

/*
export async function exampleRouteFunction(
  req: Request,
  user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
}
 */

export async function postSaveNewPassword(
  req: Request,
  user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
  try {
    // Get form data from the request
    const formData = await req.formData();

    // Extract password data from the form
    const user_email = user?.email as string;
    const website = formData.get("website") as string | null;
    const username = formData.get("username") as string | null;
    const password = formData.get("password") as string;

    // Validate required fields
    if (!user_email || !password) {
      return new Response(
        `
            <div class="alert alert-error">
              <span>User email and password are required</span>
            </div>
          `,
        {
          headers: { "content-type": "text/html" },
        },
      );
    }

    // Check if user exists
    const userExists = Http.db.query(
      "SELECT email FROM users WHERE email = ?",
      [user_email],
    ).length > 0;

    if (!userExists) {
      return new Response(
        `
            <div class="alert alert-error">
              <span>User does not exist</span>
            </div>
          `,
        {
          headers: { "content-type": "text/html" },
        },
      );
    }

    // Insert the new password into the database
    Http.db.query(
      "INSERT INTO passwords (user_email, website, username, password) VALUES (?, ?, ?, ?)",
      [user_email, website || null, username || null, password],
    );

    // Return success response
    return new Response(
      `
          <div class="alert alert-success">
            <span>Password saved successfully</span>
          </div>
        `,
      {
        headers: { "content-type": "text/html" },
      },
    );
  } catch (error) {
    console.error("Error saving password:", error);

    // Return error response
    return new Response(
      `
          <div class="alert alert-error">
            <span>Failed to save password</span>
          </div>
        `,
      {
        headers: { "content-type": "text/html" },
      },
    );
  }
}

export async function postLogin(req: Request): Promise<Response> {
  const body = await req.formData();
  const email = body.get("email");
  const password = body.get("password");

  // Ensure that email and password are strings
  if (typeof email !== "string" || typeof password !== "string") {
    return new Response("Invalid email or password format", { status: 400 });
  }

  const user = await getUserByEmail(Http.db, email);

  if (user !== null) {
    if (password == user.master_password) {
      console.log("password correct");
      const token = generateToken({
        email: user.email,
        username: user.username,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        email: user.email,
        username: user.username,
        role: user.role,
      });

      const redirectUrl = new URL(req.url).searchParams.get("redirect") ||
        "/passwords";

      const headers = new Headers({
        "Location": redirectUrl,
      });

      headers.append("Set-Cookie", `jwt=${token}; HttpOnly; Secure; Path=/`);
      headers.append(
        "Set-Cookie",
        `refreshToken=${refreshToken}; HttpOnly; Secure; Path=/`,
      );

      return new Response(null, {
        status: 302, // 302 redirect
        headers,
      });
    } else {
      console.log("password wrong");
      return new Response("Invalid credentials", { status: 401 });
    }
  } else {
    console.log("cant find email :(");
    return new Response("User not found", { status: 404 });
  }
}

export async function postLogout(
  _req: Request,
  _user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
  // Clear the JWT cookie by setting it to an empty value and making it expire
  const headers = new Headers({
    "Set-Cookie": [
      "jwt=; HttpOnly; Secure; Path=/; Max-Age=0;",
      "refreshToken=; HttpOnly; Secure; Path=/; Max-Age=0;",
    ].join(", "),
    "Location": "/", // Redirect to login page
  });

  return new Response(null, {
    status: 302, // 302 redirect
    headers,
  });
}

export async function postSubmitReview(
  req: Request,
  user: {
    email: string;
    username: string;
    role: Role;
  } | undefined,
): Promise<Response> {
  if (!user || user?.role === "guest") {
    return new Response(
      `<div id="error-dialog" hx-swap-oob="true">
        <dialog open class="modal">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Error</h3>
            <p class="py-4">You must be logged in to submit a review.</p>
            <div class="modal-action">
              <button class="btn" onclick="this.closest('dialog').close()">Close</button>
            </div>
          </div>
        </dialog>
      </div>`,
      { status: 401, headers: { "Content-Type": "text/html", "HX-Retarget": "#error-dialog", "HX-Reswap": "innerHTML" } }
    );
  }

  const formData = await req.formData();
  const alias = formData.get("alias") as string;
  const rating = formData.get("rating") as string;
  const review = formData.get("review") as string;
  const user_email = user.email;

  

  try {
    const ratingNumber = Number(rating);

    if (isNaN(ratingNumber) || ratingNumber < 1 || ratingNumber > 5) {
      return new Response(
        `<div id="error-dialog" hx-swap-oob="true">
          <dialog open class="modal">
            <div class="modal-box">
              <h3 class="font-bold text-lg">Error</h3>
              <p class="py-4">Invalid rating value. Must be between 1 and 5.</p>
              <div class="modal-action">
                <button class="btn" onclick="this.closest('dialog').close()">Close</button>
              </div>
            </div>
          </dialog>
        </div>`,
        { status: 400, headers: { "Content-Type": "text/html", "HX-Retarget": "#error-dialog", "HX-Reswap": "innerHTML" } }
      );
    }

    const reviewObj = {
      alias,
      rating: ratingNumber,
      review,
      user_email,
    };

    Http.db.query(
      "INSERT INTO reviews (user_email, alias, review, rating) VALUES (?, ?, ?, ?)",
      [
        reviewObj.user_email,
        reviewObj.alias,
        reviewObj.review,
        reviewObj.rating,
      ],
    );

    const reviews = await readReviews(Http.db);

    // Render the updated reviews section as HTML
    const reviewsHtml = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        ${reviews.map(review => `
          <div class="card bg-base-200 shadow-xl">
            <div class="card-body">
              <div class="flex items-center space-x-4">
                <div class="avatar">
                  <div class="w-12 h-12 rounded-full">
                    <img src="./images/user.png" alt="User Avatar">
                  </div>
                </div>
                <div>
                  <h3 class="card-title">${review.alias}</h3>
                  <div class="flex items-center mt-1">
                    ${Array.from({ length: 5 }, (_, i) => `
                      <span class="${i < review.rating ? 'text-yellow-400' : 'text-gray-400'}">★</span>
                    `).join('')}
                  </div>
                </div>
              </div>
              <p class="mt-4">"${review.review}"</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    return new Response(reviewsHtml, { status: 200, headers: { "Content-Type": "text/html" } });
  } catch (error) {
    console.error("Failed to add review:", error);
    
    return new Response(
      `<div id="error-dialog" hx-swap-oob="true">
        <dialog open class="modal">
          <div class="modal-box">
            <h3 class="font-bold text-lg">Error</h3>
            <p class="py-4">Something went wrong while submitting your review. Please try again later.</p>
            <div class="modal-action">
              <button class="btn" onclick="this.closest('dialog').close()">Close</button>
            </div>
          </div>
        </dialog>
      </div>`,
      { status: 500, headers: { "Content-Type": "text/html", "HX-Retarget": "#error-dialog", "HX-Reswap": "innerHTML" } }
    );
  }
}

export async function postCreateUser(
  req: Request,
  user: { email: string; username: string; role: Role } | undefined,
): Promise<Response> {
  // Check if user is admin
  if (user?.role !== "admin") {
    return new Response(
      `<div class="alert alert-error">
        <span>Unauthorized: Only admins can create users</span>
      </div>`,
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const formData = await req.formData();
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as Role;

    // Validate inputs
    if (!email || !username || !password || !role) {
      return new Response(
        `<div class="alert alert-error">
          <span>All fields are required</span>
        </div>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Validate role
    if (role !== "user" && role !== "admin") {
      return new Response(
        `<div class="alert alert-error">
          <span>Invalid role</span>
        </div>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Create user
    const success = await createUser(Http.db, email, username, password, role);
    
    if (success) {
      return new Response(
        `<div class="alert alert-success">
          <span>User created successfully</span>
        </div>`,
        { status: 200, headers: { "Content-Type": "text/html" } }
      );
    } else {
      return new Response(
        `<div class="alert alert-error">
          <span>User already exists</span>
        </div>`,
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }
  } catch (error) {
    console.error("Error creating user:", error);
    return new Response(
      `<div class="alert alert-error">
        <span>Error creating user</span>
      </div>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}
