import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSpainPresenceSchema, insertSocialEventSchema, insertEventRsvpSchema, insertTeeTimeSchema, insertMemberSchema, insertSocialMessageSchema, insertAbsenceSchema } from "@shared/schema";
import { sendBulkEmail } from "./sendgrid";
import { sendEmailViaGmail } from "./gmail-service";
import { debugSendGridConfig } from "./sendgrid-debug";
import { testSendGridDirectly } from "./email-test";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { name, password } = req.body;
      
      if (!name || !password) {
        return res.status(400).json({ message: "Navn og passord er påkrevd" });
      }
      
      const user = await storage.authenticateUserByName(name.trim(), password.trim());
      
      if (!user) {
        return res.status(401).json({ message: "Ugyldig brukernavn eller passord" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      });
    } catch (error) {
      console.error("Error during authentication:", error);
      res.status(500).json({ message: "Feil ved autentisering" });
    }
  });

  // Ensure all members have user accounts endpoint
  app.post("/api/sync-member-users", async (req, res) => {
    try {
      const members = await storage.getMembers();
      const users = await storage.getAllUsers();
      const userNames = users.map(u => u.name);
      
      // Create user accounts for members who don't have them
      for (const member of members) {
        if (!userNames.includes(member.name)) {
          await storage.createUser({
            name: member.name,
            username: member.name,
            password: 'medlem123', // Default password for new members
            role: 'Hengebuk'
          });
        }
      }
      
      res.json({ message: "Member-user sync completed" });
    } catch (error) {
      console.error("Error syncing members and users:", error);
      res.status(500).json({ message: "Failed to sync members and users" });
    }
  });

  // User management routes for admin role changes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      console.log(`Role update request - ID: ${id}, Role: ${role}`);
      
      if (!role || !['ADMIN', 'HENGEBUK', 'ASPIRANT', 'ANDRE'].includes(role)) {
        console.log(`Invalid role received: ${role}`);
        return res.status(400).json({ message: `Invalid role: ${role}. Must be one of: ADMIN, HENGEBUK, ASPIRANT, ANDRE` });
      }
      
      const user = await storage.updateUserRole(id, role);
      console.log(`Role updated successfully for user ${id}: ${role}`);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      
      if (!password || password.trim().length < 3) {
        return res.status(400).json({ message: "Passord må være minst 3 tegn" });
      }
      
      const user = await storage.updateUserPassword(id, password.trim());
      if (!user) {
        return res.status(404).json({ message: "Bruker ikke funnet" });
      }
      
      res.json({ success: true, message: "Passord oppdatert" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ message: "Kunne ikke oppdatere passord" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "Bruker ikke funnet" });
      }
      res.json({ message: "Bruker slettet" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Kunne ikke slette bruker" });
    }
  });

  // Sync users with members (admin only)
  app.post("/api/users/sync", async (req, res) => {
    try {
      await storage.syncUsersWithMembers();
      res.json({ message: "Brukerkontoer synkronisert med medlemsdatabase" });
    } catch (error) {
      console.error("Error syncing users:", error);
      res.status(500).json({ message: "Kunne ikke synkronisere brukerkontoer" });
    }
  });

  // Members
  app.get("/api/members", async (req, res) => {
    try {
      const members = await storage.getMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const data = insertMemberSchema.parse(req.body);
      const member = await storage.createMember(data);
      
      // Auto-create user account for new member if it doesn't exist
      const existingUser = await storage.getUserByName(member.name);
      if (!existingUser) {
        await storage.createUser({
          name: member.name,
          username: member.name,
          password: 'medlem123', // Default password for new members
          role: member.role || 'Hengebuk' // Use member's role or default to Hengebuk
        });
        console.log(`✅ Auto-created user account for ${member.name} with role ${member.role || 'Hengebuk'}`);
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error creating member:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("General error:", error);
        res.status(500).json({ message: "Failed to create member" });
      }
    }
  });

  app.patch("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertMemberSchema.partial().parse(req.body);
      const member = await storage.updateMember(id, data);
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update member" });
      }
    }
  });

  // Update member HCP (accessible by the member themselves)
  app.patch("/api/members/:id/hcp", async (req, res) => {
    try {
      const { id } = req.params;
      const { handicap } = req.body;
      
      // Only allow updating handicap field
      const member = await storage.updateMember(id, { handicap });
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(member);
    } catch (error) {
      console.error("Error updating member HCP:", error);
      res.status(500).json({ message: "Failed to update member HCP" });
    }
  });

  // Update member display order - MUST be before /api/members/:id route
  app.put("/api/members/order", async (req, res) => {
    try {
      const { memberIds } = req.body;
      if (!Array.isArray(memberIds)) {
        res.status(400).json({ message: "memberIds must be an array" });
        return;
      }
      
      await storage.updateMemberOrder(memberIds);
      res.json({ message: "Member order updated successfully" });
    } catch (error) {
      console.error("Error updating member order:", error);
      res.status(500).json({ message: "Failed to update member order" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log("Updating member with ID:", id);
      console.log("Request body:", req.body);
      
      // Get the current member data to check for name changes
      const currentMember = await storage.getMember(id);
      if (!currentMember) {
        console.log("Member not found for ID:", id);
        return res.status(404).json({ message: "Member not found" });
      }
      
      // Validate the data using the partial schema
      const data = insertMemberSchema.partial().parse(req.body);
      console.log("Parsed data:", data);
      
      const member = await storage.updateMember(id, data);
      if (!member) {
        console.log("Member not found for ID:", id);
        return res.status(404).json({ message: "Member not found" });
      }
      
      // If name was updated, sync it to the users table
      if (data.name && data.name !== currentMember.name) {
        try {
          console.log(`Syncing name change from "${currentMember.name}" to "${data.name}" in users table`);
          await storage.updateUserNameByOldName(currentMember.name, data.name);
          console.log("User name synchronized successfully");
        } catch (syncError) {
          console.error("Error syncing user name:", syncError);
          // Don't fail the member update if user sync fails
        }
      }
      
      // If role was updated, sync it to the users table
      if (data.role && member.name) {
        try {
          console.log(`Syncing role ${data.role} for member ${member.name} to users table`);
          await storage.updateUserRoleByName(member.name, data.role);
          console.log("User role synchronized successfully");
        } catch (syncError) {
          console.error("Error syncing user role:", syncError);
          // Don't fail the member update if user sync fails
        }
      }
      
      console.log("Member updated successfully:", member);
      res.json(member);
    } catch (error) {
      console.error("Error updating member:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Unexpected error:", error);
        res.status(500).json({ message: "Failed to update member", error: String(error) });
      }
    }
  });

  app.delete("/api/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMember(id);
      if (!deleted) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json({ message: "Member deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  // Spain Presence
  app.get("/api/spain-presence", async (req, res) => {
    try {
      const presence = await storage.getSpainPresence();
      res.json(presence);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Spain presence" });
    }
  });

  app.post("/api/spain-presence", async (req, res) => {
    try {
      const data = insertSpainPresenceSchema.parse(req.body);
      const presence = await storage.createSpainPresence(data);
      res.json(presence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create Spain presence" });
      }
    }
  });

  app.put("/api/spain-presence/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertSpainPresenceSchema.partial().parse(req.body);
      const presence = await storage.updateSpainPresence(id, data);
      if (!presence) {
        return res.status(404).json({ message: "Spain presence not found" });
      }
      res.json(presence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update Spain presence" });
      }
    }
  });

  app.delete("/api/spain-presence/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSpainPresence(id);
      if (!deleted) {
        return res.status(404).json({ message: "Spain presence not found" });
      }
      res.json({ message: "Spain presence deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete Spain presence" });
    }
  });

  // Tee Times
  app.get("/api/tee-times", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let teeTimes;
      
      if (startDate && endDate) {
        teeTimes = await storage.getTeeTimesByDateRange(startDate as string, endDate as string);
      } else {
        teeTimes = await storage.getTeeTimes();
      }
      
      res.json(teeTimes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tee times" });
    }
  });

  app.post("/api/tee-times", async (req, res) => {
    try {
      const data = insertTeeTimeSchema.parse(req.body);
      const teeTime = await storage.createTeeTime(data);
      res.json(teeTime);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create tee time" });
      }
    }
  });

  app.delete("/api/tee-times/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTeeTime(id);
      if (!deleted) {
        return res.status(404).json({ message: "Tee time not found" });
      }
      res.json({ message: "Tee time deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete tee time" });
    }
  });

  // Absence endpoints
  app.get("/api/absences", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let absences;
      
      if (startDate && endDate) {
        absences = await storage.getAbsencesByDateRange(startDate as string, endDate as string);
      } else {
        absences = await storage.getAbsences();
      }
      
      res.json(absences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch absences" });
    }
  });

  app.post("/api/absences", async (req, res) => {
    try {
      const data = insertAbsenceSchema.parse(req.body);
      const absence = await storage.createAbsence(data);
      res.json(absence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create absence" });
      }
    }
  });

  app.patch("/api/absences/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, userId } = req.body; // Add userId to request
      
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return res.status(400).json({ message: "Reason is required" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get the absence to check ownership
      const existingAbsence = await storage.getAbsence(id);
      if (!existingAbsence) {
        return res.status(404).json({ message: "Absence not found" });
      }
      
      // Get user to check if admin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid user" });
      }
      
      // Check if user can edit this absence (must be creator or admin)
      // For old absences where createdBy is null, allow any authenticated user (since frontend controls access)
      let canEdit = false;
      if (user.role.toLowerCase() === 'admin') {
        canEdit = true;
      } else if (existingAbsence.createdBy === userId) {
        canEdit = true;
      } else if (existingAbsence.createdBy === null) {
        // For old absences with no createdBy, allow editing since frontend handles access control
        canEdit = true;
      }
      
      if (!canEdit) {
        return res.status(403).json({ message: "Du kan kun redigere dine egne fraværsmeldinger" });
      }
      
      const updated = await storage.updateAbsence(id, { reason: reason.trim() });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update absence" });
    }
  });

  app.delete("/api/absences/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query; // Get userId from query params
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get the absence to check ownership
      const existingAbsence = await storage.getAbsence(id);
      if (!existingAbsence) {
        return res.status(404).json({ message: "Absence not found" });
      }
      
      // Get user to check if admin
      const user = await storage.getUser(userId as string);
      if (!user) {
        return res.status(401).json({ message: "Invalid user" });
      }
      
      // Check if user can delete this absence (must be creator or admin)
      // For old absences where createdBy is null, allow any authenticated user (since frontend controls access)
      let canDelete = false;
      if (user.role.toLowerCase() === 'admin') {
        canDelete = true;
      } else if (existingAbsence.createdBy === userId) {
        canDelete = true;
      } else if (existingAbsence.createdBy === null) {
        // For old absences with no createdBy, allow deletion since frontend handles access control
        canDelete = true;
      }
      
      if (!canDelete) {
        return res.status(403).json({ message: "Du kan kun slette dine egne fraværsmeldinger" });
      }
      
      const deleted = await storage.deleteAbsence(id);
      res.json({ message: "Absence deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete absence" });
    }
  });

  // Social Events
  app.get("/api/social-events", async (req, res) => {
    try {
      const events = await storage.getSocialEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch social events" });
    }
  });

  app.post("/api/social-events", async (req, res) => {
    try {
      const data = insertSocialEventSchema.parse(req.body);
      const event = await storage.createSocialEvent(data);
      res.json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create social event" });
      }
    }
  });

  // Event RSVPs
  app.get("/api/event-rsvps", async (req, res) => {
    try {
      const rsvps = await storage.getAllEventRsvps();
      res.json(rsvps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all RSVPs" });
    }
  });

  app.get("/api/social-events/:eventId/rsvps", async (req, res) => {
    try {
      const { eventId } = req.params;
      const rsvps = await storage.getEventRsvps(eventId);
      res.json(rsvps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RSVPs" });
    }
  });

  app.post("/api/social-events/:eventId/rsvps", async (req, res) => {
    try {
      const { eventId } = req.params;
      const data = insertEventRsvpSchema.parse({ ...req.body, eventId });
      const rsvp = await storage.createEventRsvp(data);
      res.json(rsvp);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create RSVP" });
      }
    }
  });

  app.delete("/api/social-events/:eventId/rsvps/:memberId", async (req, res) => {
    try {
      const { eventId, memberId } = req.params;
      const deleted = await storage.deleteEventRsvp(eventId, memberId);
      if (!deleted) {
        return res.status(404).json({ message: "RSVP not found" });
      }
      res.json({ message: "RSVP deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete RSVP" });
    }
  });

  // Add test route for debugging connection issues
  app.get('/status', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'HENGEBUKEN server is running'
    });
  });

  app.get('/debug', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="no">
        <head>
          <meta charset="UTF-8">
          <title>HENGEBUKEN - Debug</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { background: #22c55e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .section { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
            button { padding: 10px 15px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            button:hover { background: #16a34a; }
            .result { margin-top: 10px; padding: 10px; background: white; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏌️ HENGEBUKEN - Debug</h1>
            <p>Server Status: ✅ Running (${new Date().toLocaleString('no-NO')})</p>
          </div>
          
          <div class="section">
            <h3>API Tests</h3>
            <button onclick="testMembers()">Test Members API</button>
            <button onclick="testSpain()">Test Spain Presence API</button>
            <button onclick="testTeeTimes()">Test Tee Times API</button>
            <div id="api-results" class="result"></div>
          </div>
          
          <div class="section">
            <h3>Neste Steg</h3>
            <p>Hvis disse testene fungerer, men hovedsiden ikke gjør det, så er problemet med React/Vite-oppsett.</p>
            <button onclick="window.location.href='/'">Gå til Hovedside</button>
          </div>

          <script>
            function testMembers() {
              document.getElementById('api-results').innerHTML = '<p>Testing members API...</p>';
              fetch('/api/members')
                .then(response => response.json())
                .then(data => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>✅ Members API OK</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>❌ Members API Error</h4><p>' + error.message + '</p>';
                });
            }
            
            function testSpain() {
              document.getElementById('api-results').innerHTML = '<p>Testing Spain presence API...</p>';
              fetch('/api/spain-presence')
                .then(response => response.json())
                .then(data => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>✅ Spain Presence API OK</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>❌ Spain Presence API Error</h4><p>' + error.message + '</p>';
                });
            }
            
            function testTeeTimes() {
              document.getElementById('api-results').innerHTML = '<p>Testing tee times API...</p>';
              fetch('/api/tee-times')
                .then(response => response.json())
                .then(data => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>✅ Tee Times API OK</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                })
                .catch(error => {
                  document.getElementById('api-results').innerHTML = 
                    '<h4>❌ Tee Times API Error</h4><p>' + error.message + '</p>';
                });
            }
            
            // Run initial test
            setTimeout(testMembers, 500);
          </script>
        </body>
      </html>
    `);
  });

  // Social Messages routes
  app.get("/api/social-messages", async (req, res) => {
    try {
      const messages = await storage.getSocialMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching social messages:", error);
      res.status(500).json({ message: "Failed to fetch social messages" });
    }
  });

  app.post("/api/social-messages", async (req, res) => {
    try {
      const messageData = insertSocialMessageSchema.parse(req.body);
      
      // Create message
      const message = await storage.createSocialMessage(messageData);
      
      // Send email notifications to selected roles
      if (messageData.recipientRoles && messageData.recipientRoles.length > 0) {
        const members = await storage.getMembers();
        const emailRecipients = members
          .filter(member => 
            messageData.recipientRoles?.includes(member.role || 'Hengebuk') && 
            member.email && 
            member.email.trim() !== ''
          )
          .map(member => member.email!)
          .filter(email => email.includes('@')); // Basic email validation

        if (emailRecipients.length > 0) {
          console.log(`📧 Sender e-post-varsling til ${emailRecipients.length} mottakere:`, emailRecipients);
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <p style="font-size: 14px; color: #059669; font-weight: bold; margin-bottom: 10px;">Fra HENGEBUKEN</p>
              <h3>${messageData.title}</h3>
              <div style="white-space: pre-line; margin: 20px 0;">${messageData.content}</div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
              <p style="color: #666;">Hilsen,<br><strong>${messageData.signature || 'HENGEBUKEN'}</strong></p>
              <p style="font-size: 12px; color: #999;">
                Denne meldingen ble sendt fra HENGEBUKEN-appen.
              </p>
            </div>
          `;

          // Try Gmail service first, then fallback to SendGrid
          let emailSent = await sendEmailViaGmail({
            to: emailRecipients,
            from: 'HENGEBUKEN <hengebuken@gmail.com>',
            subject: `${messageData.title}`,
            text: `${messageData.content}\n\nHilsen,\n${messageData.signature || 'HENGEBUKEN'}`,
            html: emailHtml
          });

          // If Gmail fails, try SendGrid as backup
          if (!emailSent) {
            console.log('📧 Gmail feilet, prøver SendGrid som backup...');
            emailSent = await sendBulkEmail({
              to: emailRecipients,
              from: 'HENGEBUKEN <svhilm13@gmail.com>',
              subject: `${messageData.title}`,
              text: `${messageData.content}\n\nHilsen,\n${messageData.signature || 'HENGEBUKEN'}`,
              html: emailHtml
            });
          }
          if (!emailSent) {
            console.warn('⚠️  E-post-varsling feilet - sjekk SendGrid-konfigurasjon');
          } else {
            console.log('✅ E-post-varsling sendt til alle mottakere');
          }
        } else {
          console.log('No email recipients found for the selected roles');
        }
      }
      
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating social message:", error);
      res.status(500).json({ message: "Failed to create social message" });
    }
  });

  app.delete("/api/social-messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSocialMessage(id);
      
      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting social message:", error);
      res.status(500).json({ message: "Failed to delete social message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
