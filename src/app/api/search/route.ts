import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ users: [], releases: [] });
    }

    const searchQuery = `%${q}%`;

    // Search Users (Limit 3)
    let usersQuery = `
      SELECT id, username, email, company_name, full_name, profile_picture 
      FROM users 
      WHERE (full_name LIKE ? OR company_name LIKE ? OR email LIKE ? OR username LIKE ?)
    `;
    let userParams = [searchQuery, searchQuery, searchQuery, searchQuery];

    // If user is not Admin/Operator, maybe they shouldn't search all users, but for now we'll allow basic search or limit it.
    usersQuery += ` LIMIT 3`;

    const [users] = await db.query(usersQuery, userParams);

    // Search Releases (Limit 3)
    let releasesQuery = `
      SELECT id, title, main_artist, cover_image 
      FROM releases 
      WHERE (title LIKE ? OR main_artist LIKE ?)
    `;
    let releaseParams = [searchQuery, searchQuery];

    if (session.role === "User") {
      releasesQuery += ` AND user_id = ?`;
      releaseParams.push(session.userId);
    }
    releasesQuery += ` LIMIT 3`;

    const [releases] = await db.query(releasesQuery, releaseParams);

    return NextResponse.json({
      users: users || [],
      releases: releases || []
    });

  } catch (error: any) {
    console.error("API Error - GET /api/search:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}
