// app/api/settings/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { household: true }
    });

    if (!user?.household) {
      // Create household if doesn't exist
      const household = await prisma.household.create({
        data: {
          name: `${user?.name || 'My'} Household`,
          users: { connect: { id: user!.id } }
        }
      });
      
      // Update user with household
      await prisma.user.update({
        where: { id: user!.id },
        data: { householdId: household.id }
      });

      // @ts-expect-error - Prisma client types not fully updated
      await prisma.householdSettings.create({
        data: { householdId: household.id }
      });

      // Refetch user with household
      const updatedUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { household: true }
      });
      
      if (!updatedUser?.household || !user) {
        return NextResponse.json({ error: "Failed to create household" }, { status: 500 });
      }

      user.household = updatedUser.household;
    }

    if (!user?.household) {
      return NextResponse.json({ error: "No household found" }, { status: 500 });
    }

    // Get settings
    // @ts-expect-error - Prisma client types not fully updated
    const settings = await prisma.householdSettings.findUnique({
      where: { householdId: user.household.id }
    });

    // Parse JSON fields back to objects/arrays
    const parsedSettings = settings ? {
      ...settings,
      selectedCalendars: settings.selectedCalendars ? JSON.parse(settings.selectedCalendars) : [],
      familyMembers: settings.familyMembers ? JSON.parse(settings.familyMembers) : [],
      sitterExceptions: settings.sitterExceptions ? JSON.parse(settings.sitterExceptions) : [],
      preferredAirports: settings.preferredAirports ? JSON.parse(settings.preferredAirports) : []
    } : {};

    return NextResponse.json({ 
      settings: parsedSettings,
      householdId: user.household!.id 
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { settings } = await request.json();

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { household: true }
    });

    if (!user?.household) {
      return NextResponse.json({ error: "No household found" }, { status: 404 });
    }

    // Update or create settings
    // @ts-expect-error - Prisma client types not fully updated
    const updatedSettings = await prisma.householdSettings.upsert({
      where: { householdId: user.household.id },
      update: {
        selectedCalendars: settings.selectedCalendars ? JSON.stringify(settings.selectedCalendars) : null,
        homeCity: settings.homeCity,
        homeState: settings.homeState,
        homeCountry: settings.homeCountry,
        workAddress: settings.workAddress,
        familyMembers: settings.familyMembers ? JSON.stringify(settings.familyMembers) : null,
        bookFlightsDaysAhead: settings.bookFlightsDaysAhead,
        bookSitterDaysAhead: settings.bookSitterDaysAhead,
        bookHotelsDaysAhead: settings.bookHotelsDaysAhead,
        defaultSitterNeeded: settings.defaultSitterNeeded,
        sitterStartTime: settings.sitterStartTime,
        sitterExceptions: settings.sitterExceptions ? JSON.stringify(settings.sitterExceptions) : null,
        drivingRadiusMiles: settings.drivingRadiusMiles,
        preferredAirports: settings.preferredAirports ? JSON.stringify(settings.preferredAirports) : null,
        customContext: settings.customContext,
      },
      create: {
        householdId: user.household.id,
        selectedCalendars: settings.selectedCalendars ? JSON.stringify(settings.selectedCalendars) : null,
        homeCity: settings.homeCity,
        homeState: settings.homeState,
        homeCountry: settings.homeCountry,
        workAddress: settings.workAddress,
        familyMembers: settings.familyMembers ? JSON.stringify(settings.familyMembers) : null,
        bookFlightsDaysAhead: settings.bookFlightsDaysAhead || 60,
        bookSitterDaysAhead: settings.bookSitterDaysAhead || 14,
        bookHotelsDaysAhead: settings.bookHotelsDaysAhead || 30,
        defaultSitterNeeded: settings.defaultSitterNeeded ?? true,
        sitterStartTime: settings.sitterStartTime || 18,
        sitterExceptions: settings.sitterExceptions ? JSON.stringify(settings.sitterExceptions) : null,
        drivingRadiusMiles: settings.drivingRadiusMiles || 50,
        preferredAirports: settings.preferredAirports ? JSON.stringify(settings.preferredAirports) : null,
        customContext: settings.customContext,
      }
    });

    return NextResponse.json({ 
      success: true,
      settings: updatedSettings 
    });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}