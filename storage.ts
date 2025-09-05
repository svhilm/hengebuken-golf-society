import { 
  type User, type InsertUser,
  type Member, type InsertMember, 
  type SpainPresence, type InsertSpainPresence, 
  type TeeTime, type InsertTeeTime, 
  type SocialEvent, type InsertSocialEvent, 
  type EventRsvp, type InsertEventRsvp,
  type SocialMessage, type InsertSocialMessage,
  type Absence, type InsertAbsence
} from "@shared/schema";
import { db } from "./db";
import { users, members, spainPresence, teeTimes, socialEvents, eventRsvps, socialMessages, absences } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  authenticateUserByName(name: string, password: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUserRoleByName(name: string, role: string): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Members
  getMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: string, member: Partial<InsertMember>): Promise<Member | undefined>;
  updateMemberOrder(memberIds: string[]): Promise<void>;
  deleteMember(id: string): Promise<boolean>;

  // Spain Presence
  getSpainPresence(): Promise<SpainPresence[]>;
  getSpainPresenceByMember(memberId: string): Promise<SpainPresence[]>;
  createSpainPresence(presence: InsertSpainPresence): Promise<SpainPresence>;
  updateSpainPresence(id: string, presence: Partial<InsertSpainPresence>): Promise<SpainPresence | undefined>;
  deleteSpainPresence(id: string): Promise<boolean>;

  // Tee Times
  getTeeTimes(): Promise<TeeTime[]>;
  getTeeTimesByDateRange(startDate: string, endDate: string): Promise<TeeTime[]>;
  createTeeTime(teeTime: InsertTeeTime): Promise<TeeTime>;
  deleteTeeTime(id: string): Promise<boolean>;

  // Social Events
  getSocialEvents(): Promise<SocialEvent[]>;
  getSocialEvent(id: string): Promise<SocialEvent | undefined>;
  createSocialEvent(event: InsertSocialEvent): Promise<SocialEvent>;
  updateSocialEvent(id: string, event: Partial<InsertSocialEvent>): Promise<SocialEvent | undefined>;
  deleteSocialEvent(id: string): Promise<boolean>;

  // Event RSVPs
  getAllEventRsvps(): Promise<EventRsvp[]>;
  getEventRsvps(eventId: string): Promise<EventRsvp[]>;
  createEventRsvp(rsvp: InsertEventRsvp): Promise<EventRsvp>;
  deleteEventRsvp(eventId: string, memberId: string): Promise<boolean>;

  // Social Messages
  getSocialMessages(): Promise<SocialMessage[]>;
  createSocialMessage(message: InsertSocialMessage): Promise<SocialMessage>;
  deleteSocialMessage(id: string): Promise<boolean>;

  // Absences
  getAbsences(): Promise<Absence[]>;
  getAbsence(id: string): Promise<Absence | undefined>;
  getAbsencesByDateRange(startDate: string, endDate: string): Promise<Absence[]>;
  createAbsence(absence: InsertAbsence): Promise<Absence>;
  updateAbsence(id: string, absence: Partial<InsertAbsence>): Promise<Absence | undefined>;
  deleteAbsence(id: string): Promise<boolean>;

  // Sync operations
  syncUsersWithMembers(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByName(name: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    return user;
  }

  async authenticateUserByName(name: string, password: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    if (!user || user.password !== password) {
      return null;
    }
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserRoleByName(name: string, role: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.name, name))
      .returning();
    return user;
  }

  async updateUserNameByOldName(oldName: string, newName: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ name: newName, username: newName, updatedAt: new Date() })
      .where(eq(users.name, oldName))
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  // Sync users with members - create user accounts for any members who don't have them
  async syncUsersWithMembers(): Promise<void> {
    try {
      const members = await this.getMembers();
      const users = await this.getAllUsers();
      
      const userNames = new Set(users.map(u => u.name));
      
      for (const member of members) {
        if (!userNames.has(member.name)) {
          await this.createUser({
            name: member.name,
            username: member.name,
            password: 'medlem123',
            role: member.role || 'HENGEBUK'
          });
          console.log(`✅ Created user account for existing member: ${member.name} (rolle: ${member.role || 'HENGEBUK'})`);
        }
      }
    } catch (error) {
      console.error('❌ Error syncing users with members:', error);
    }
  }

  // Initialize database with default users and members
  async initializeDatabase() {
    // Check if we have members - don't auto-reload
    const existingMembers = await db.select().from(members);
    console.log(`Found ${existingMembers.length} existing members`);
    if (existingMembers.length > 0) {
      return; // Data already exists
    }
    
    // Clear existing data to reload fresh 50 members
    console.log("Clearing existing data to reload 50 members");
    
    // Delete foreign key referenced data first
    await db.delete(spainPresence);
    await db.delete(teeTimes);
    await db.delete(eventRsvps);
    await db.delete(socialEvents);
    
    // Now delete members and users
    await db.delete(members);
    await db.delete(users);

    // Create admin users with credentials
    await db.insert(users).values([
      { name: "Svein Hilmersen", username: "Svein Hilmersen", password: "admin123", role: "ADMIN" },
      { name: "Bjørn Mørck", username: "Bjørn Mørck", password: "admin123", role: "ADMIN" }
    ]);

    // Create sample members including admins - 50 members total
    const sampleMembers = [
      { name: "Svein Hilmersen", address: "Haugtbo Terrasse 60", postNumber: "1405", city: "Langhus", email: "svein.hilmersen@gmail.com", phone: "+47 900 14 414", golfNumber: "30.14092", aksjeNumber: "104", villaNummer: "20,1", handicap: "8.0", role: "ADMIN", innmeldt: "2024", birthDate: "13.10.1945", initials: "SH" },
      { name: "Bjørn Mørck", address: "Solhøiveien 5", postNumber: "1553", city: "Son", email: "bjorn.morck@online.no", phone: "+47 976 72 407", golfNumber: "10.4213", aksjeNumber: "370", villaNummer: null, handicap: "12.5", role: "HENGEBUK", innmeldt: "2014", birthDate: "24.07.1947", initials: "BM" },
      { name: "Kjell Huseby", address: "Rankebyåsen 6", postNumber: "1606", city: "Fredrikstad", email: "kjell.huseby@gmail.com", phone: "+47 900 78 824", golfNumber: "148.284", aksjeNumber: "192", villaNummer: null, handicap: "15.2", role: "ANDRE", innmeldt: "2014", birthDate: "03.10.1945", initials: "KH" },
      { name: "Odd Aagesen", address: "Nedre Torggate 12", postNumber: "3015", city: "Drammen", email: "odd.aag@online.no", phone: "+47 900 98 359", golfNumber: "33.1175", aksjeNumber: "364", villaNummer: null, handicap: "18.1", role: "HENGEBUK", innmeldt: "2014", birthDate: "14.03.1942", initials: "OA" },
      { name: "Lars Hansen", address: "Storgata 45", postNumber: "0184", city: "Oslo", email: "lars.hansen@hotmail.com", phone: "+47 922 33 445", golfNumber: "22.8834", aksjeNumber: "201", villaNummer: "15,2", handicap: "14.3", role: "HENGEBUK", innmeldt: "2015", birthDate: "22.08.1955", initials: "LH" },
      { name: "Per Andersen", address: "Kirkegata 12", postNumber: "4612", city: "Kristiansand", email: "per.andersen@gmail.com", phone: "+47 911 55 667", golfNumber: "45.2211", aksjeNumber: "089", villaNummer: null, handicap: "16.8", role: "ASPIRANT", innmeldt: "2016", birthDate: "15.03.1962", initials: "PA" },
      { name: "Nils Olsen", address: "Havnegata 8", postNumber: "9008", city: "Tromsø", email: "nils.olsen@yahoo.no", phone: "+47 934 77 889", golfNumber: "67.4455", aksjeNumber: "412", villaNummer: "8,3", handicap: "11.2", role: "HENGEBUK", innmeldt: "2017", birthDate: "30.11.1958", initials: "NO" },
      { name: "Erik Johannessen", address: "Skolegata 23", postNumber: "7030", city: "Trondheim", email: "erik.johannessen@online.no", phone: "+47 945 88 112", golfNumber: "89.6677", aksjeNumber: "156", villaNummer: null, handicap: "19.5", role: "ANDRE", innmeldt: "2018", birthDate: "18.05.1951", initials: "EJ" },
      { name: "Tor Kristiansen", address: "Industriveien 34", postNumber: "4005", city: "Stavanger", email: "tor.kristiansen@gmail.com", phone: "+47 956 22 334", golfNumber: "12.3344", aksjeNumber: "278", villaNummer: "12,1", handicap: "13.7", role: "HENGEBUK", innmeldt: "2019", birthDate: "07.12.1963", initials: "TK" },
      { name: "Geir Svendsen", address: "Fjellveien 67", postNumber: "5020", city: "Bergen", email: "geir.svendsen@hotmail.com", phone: "+47 967 44 556", golfNumber: "34.5566", aksjeNumber: "345", villaNummer: null, handicap: "17.1", role: "ASPIRANT", innmeldt: "2020", birthDate: "25.09.1960", initials: "GS" },
      { name: "Arne Nilsen", address: "Parkveien 89", postNumber: "1450", city: "Nesoddtangen", email: "arne.nilsen@yahoo.no", phone: "+47 978 55 778", golfNumber: "56.7788", aksjeNumber: "167", villaNummer: "25,4", handicap: "9.4", role: "HENGEBUK", innmeldt: "2021", birthDate: "11.04.1957", initials: "AN" },
      { name: "Knut Larsen", address: "Bygata 15", postNumber: "2000", city: "Lillestrøm", email: "knut.larsen@gmail.com", phone: "+47 989 66 889", golfNumber: "78.9900", aksjeNumber: "234", villaNummer: null, handicap: "20.3", role: "ANDRE", innmeldt: "2022", birthDate: "03.01.1954", initials: "KL" },
      { name: "Rolf Pedersen", address: "Engtofta 42", postNumber: "1555", city: "Son", email: "rolf.pedersen@online.no", phone: "+47 990 77 001", golfNumber: "90.1122", aksjeNumber: "456", villaNummer: "18,2", handicap: "15.9", role: "HENGEBUK", innmeldt: "2023", birthDate: "14.07.1959", initials: "RP" },
      { name: "Ole Martin Berg", address: "Torgveien 78", postNumber: "3050", city: "Mjøndalen", email: "ole.berg@hotmail.com", phone: "+47 901 88 223", golfNumber: "11.2233", aksjeNumber: "123", villaNummer: null, handicap: "12.6", role: "ASPIRANT", innmeldt: "2024", birthDate: "20.02.1961", initials: "OMB" },
      { name: "Jan Erik Haugen", address: "Osloveien 156", postNumber: "1430", city: "Ås", email: "jan.haugen@gmail.com", phone: "+47 912 99 334", golfNumber: "33.4455", aksjeNumber: "789", villaNummer: "22,3", handicap: "18.7", role: "ANDRE", innmeldt: "2025", birthDate: "29.06.1956", initials: "JEH" },
      { name: "Magnus Solberg", address: "Ringeriksgata 91", postNumber: "3510", city: "Hønefoss", email: "magnus.solberg@yahoo.no", phone: "+47 923 00 445", golfNumber: "55.6677", aksjeNumber: "321", villaNummer: null, handicap: "14.1", role: "HENGEBUK", innmeldt: "2020", birthDate: "16.08.1964", initials: "MS" },
      { name: "Finn Carlsen", address: "Bakkegata 33", postNumber: "1600", city: "Fredrikstad", email: "finn.carlsen@online.no", phone: "+47 934 11 556", golfNumber: "77.8899", aksjeNumber: "654", villaNummer: "9,1", handicap: "21.4", role: "ASPIRANT", innmeldt: "2021", birthDate: "05.11.1952", initials: "FC" },
      { name: "Steinar Lund", address: "Gamleveien 24", postNumber: "2050", city: "Jessheim", email: "steinar.lund@gmail.com", phone: "+47 945 22 667", golfNumber: "99.0011", aksjeNumber: "987", villaNummer: null, handicap: "10.8", role: "HENGEBUK", innmeldt: "2022", birthDate: "12.12.1958", initials: "SL" },
      { name: "Robert Strand", address: "Nedre Slottsgate 67", postNumber: "0157", city: "Oslo", email: "robert.strand@hotmail.com", phone: "+47 956 33 778", golfNumber: "00.1122", aksjeNumber: "147", villaNummer: "14,5", handicap: "16.2", role: "ANDRE", innmeldt: "2023", birthDate: "08.04.1965", initials: "RS" },
      { name: "Gunnar Eide", address: "Kongeveien 45", postNumber: "3300", city: "Hokksund", email: "gunnar.eide@yahoo.no", phone: "+47 967 44 889", golfNumber: "22.3344", aksjeNumber: "258", villaNummer: null, handicap: "13.5", role: "HENGEBUK", innmeldt: "2024", birthDate: "21.09.1962", initials: "GE" },
      { name: "Terje Kvam", address: "Elvegata 78", postNumber: "2450", city: "Raufoss", email: "terje.kvam@gmail.com", phone: "+47 978 55 990", golfNumber: "44.5566", aksjeNumber: "369", villaNummer: "11,2", handicap: "17.8", role: "ASPIRANT", innmeldt: "2025", birthDate: "17.01.1960", initials: "TKv" },
      { name: "Håkon Dahl", address: "Sentrumsveien 12", postNumber: "2000", city: "Lillestrøm", email: "hakon.dahl@online.no", phone: "+47 989 66 001", golfNumber: "66.7788", aksjeNumber: "741", villaNummer: null, handicap: "19.9", role: "ANDRE", innmeldt: "2020", birthDate: "26.05.1953", initials: "HD" },
      { name: "Morten Lie", address: "Postboks 45", postNumber: "1440", city: "Drøbak", email: "morten.lie@hotmail.com", phone: "+47 990 77 112", golfNumber: "88.9900", aksjeNumber: "852", villaNummer: "7,4", handicap: "11.7", role: "HENGEBUK", innmeldt: "2021", birthDate: "04.03.1967", initials: "ML" },
      { name: "Øystein Ruud", address: "Kjølberggata 89", postNumber: "0653", city: "Oslo", email: "oystein.ruud@gmail.com", phone: "+47 901 88 223", golfNumber: "00.1133", aksjeNumber: "963", villaNummer: null, handicap: "15.3", role: "ASPIRANT", innmeldt: "2022", birthDate: "13.10.1959", initials: "ØR" },
      { name: "Leif Holm", address: "Industrigata 56", postNumber: "1781", city: "Halden", email: "leif.holm@yahoo.no", phone: "+47 912 99 334", golfNumber: "11.2244", aksjeNumber: "159", villaNummer: "19,3", handicap: "22.1", role: "ANDRE", innmeldt: "2023", birthDate: "09.07.1950", initials: "LH2" },
      { name: "Dag Sørensen", address: "Bjørnveien 34", postNumber: "1400", city: "Ski", email: "dag.sorensen@online.no", phone: "+47 923 00 445", golfNumber: "33.4466", aksjeNumber: "357", villaNummer: null, handicap: "18.6", role: "HENGEBUK", innmeldt: "2024", birthDate: "28.11.1961", initials: "DS" },
      { name: "Frode Bakken", address: "Åsveien 67", postNumber: "1430", city: "Ås", email: "frode.bakken@gmail.com", phone: "+47 934 11 556", golfNumber: "55.6688", aksjeNumber: "468", villaNummer: "16,1", handicap: "12.9", role: "ASPIRANT", innmeldt: "2025", birthDate: "15.02.1963", initials: "FB" },
      { name: "Helge Røed", address: "Strandveien 123", postNumber: "1366", city: "Lysaker", email: "helge.roed@hotmail.com", phone: "+47 945 22 667", golfNumber: "77.8800", aksjeNumber: "579", villaNummer: null, handicap: "14.7", role: "ANDRE", innmeldt: "2020", birthDate: "06.08.1956", initials: "HR" },
      { name: "Asbjørn Moe", address: "Fagerstrand 89", postNumber: "1390", city: "Vollen", email: "asbjorn.moe@yahoo.no", phone: "+47 956 33 778", golfNumber: "99.0022", aksjeNumber: "680", villaNummer: "13,5", handicap: "20.5", role: "HENGEBUK", innmeldt: "2021", birthDate: "23.12.1954", initials: "AM" },
      { name: "Ivar Jansen", address: "Moerveien 45", postNumber: "1385", city: "Asker", email: "ivar.jansen@gmail.com", phone: "+47 967 44 889", golfNumber: "00.1144", aksjeNumber: "791", villaNummer: null, handicap: "16.4", role: "ASPIRANT", innmeldt: "2022", birthDate: "10.04.1965", initials: "IJ" },
      { name: "Kåre Simonsen", address: "Slottsfjellet 23", postNumber: "3103", city: "Tønsberg", email: "kare.simonsen@online.no", phone: "+47 978 55 990", golfNumber: "22.3355", aksjeNumber: "802", villaNummer: "21,2", handicap: "11.1", role: "ANDRE", innmeldt: "2023", birthDate: "19.06.1968", initials: "KS" },
      { name: "Einar Berge", address: "Høyenhall 67", postNumber: "0661", city: "Oslo", email: "einar.berge@hotmail.com", phone: "+47 989 66 001", golfNumber: "44.5577", aksjeNumber: "913", villaNummer: null, handicap: "17.6", role: "HENGEBUK", innmeldt: "2024", birthDate: "02.01.1957", initials: "EB" },
      { name: "Johnny Haugen", address: "Kongensgate 12", postNumber: "7011", city: "Trondheim", email: "johnny.haugen@yahoo.no", phone: "+47 990 77 112", golfNumber: "66.7799", aksjeNumber: "024", villaNummer: "6,3", handicap: "13.8", role: "ASPIRANT", innmeldt: "2025", birthDate: "14.09.1966", initials: "JH" },
      { name: "Arild Vik", address: "Nesodden 89", postNumber: "1450", city: "Nesoddtangen", email: "arild.vik@gmail.com", phone: "+47 901 88 223", golfNumber: "88.9911", aksjeNumber: "135", villaNummer: null, handicap: "19.2", role: "ANDRE", innmeldt: "2020", birthDate: "27.03.1952", initials: "AV" },
      { name: "Bendik Engen", address: "Skogsveien 34", postNumber: "1950", city: "Rubbestadneset", email: "bendik.engen@online.no", phone: "+47 912 99 334", golfNumber: "00.1155", aksjeNumber: "246", villaNummer: "17,4", handicap: "15.1", role: "HENGEBUK", innmeldt: "2021", birthDate: "01.05.1964", initials: "BE" },
      { name: "Kristian Aasen", address: "Ringveien 56", postNumber: "1540", city: "Vestby", email: "kristian.aasen@hotmail.com", phone: "+47 923 00 445", golfNumber: "22.3366", aksjeNumber: "357", villaNummer: null, handicap: "21.7", role: "ASPIRANT", innmeldt: "2022", birthDate: "18.11.1951", initials: "KA" },
      { name: "Sindre Haugen", address: "Kirkegaten 78", postNumber: "2100", city: "Skedsmo", email: "sindre.haugen@gmail.com", phone: "+47 934 11 556", golfNumber: "44.5588", aksjeNumber: "468", villaNummer: "10,1", handicap: "12.3", role: "ANDRE", innmeldt: "2023", birthDate: "24.07.1969", initials: "SH2" },
      { name: "Trond Lien", address: "Elvebakken 91", postNumber: "1405", city: "Langhus", email: "trond.lien@yahoo.no", phone: "+47 945 22 667", golfNumber: "66.7700", aksjeNumber: "579", villaNummer: null, handicap: "18.4", role: "HENGEBUK", innmeldt: "2024", birthDate: "07.12.1962", initials: "TL" },
      { name: "Rune Holte", address: "Bjørkevollen 23", postNumber: "1407", city: "Vinterbro", email: "rune.holte@online.no", phone: "+47 956 33 778", golfNumber: "88.9922", aksjeNumber: "680", villaNummer: "23,5", handicap: "14.9", role: "ASPIRANT", innmeldt: "2025", birthDate: "11.08.1958", initials: "RH" },
      { name: "Espen Dyrnes", address: "Gamleveien 45", postNumber: "1470", city: "Lørenskog", email: "espen.dyrnes@gmail.com", phone: "+47 967 44 889", golfNumber: "00.1166", aksjeNumber: "791", villaNummer: null, handicap: "16.7", role: "ANDRE", innmeldt: "2020", birthDate: "30.04.1955", initials: "ED" },
      { name: "Petter Ness", address: "Solsiden 67", postNumber: "1482", city: "Nittedal", email: "petter.ness@hotmail.com", phone: "+47 978 55 990", golfNumber: "22.3377", aksjeNumber: "802", villaNummer: "5,2", handicap: "20.8", role: "HENGEBUK", innmeldt: "2021", birthDate: "22.01.1953", initials: "PN" },
      { name: "Kenneth Bye", address: "Industriområdet 89", postNumber: "1640", city: "Råde", email: "kenneth.bye@yahoo.no", phone: "+47 989 66 001", golfNumber: "44.5599", aksjeNumber: "913", villaNummer: null, handicap: "13.2", role: "ASPIRANT", innmeldt: "2022", birthDate: "16.06.1961", initials: "KB" },
      { name: "Sturla Wold", address: "Høgda 12", postNumber: "1440", city: "Drøbak", email: "sturla.wold@gmail.com", phone: "+47 990 77 112", golfNumber: "66.7788", aksjeNumber: "024", villaNummer: "24,1", handicap: "17.3", role: "ANDRE", innmeldt: "2023", birthDate: "05.09.1967", initials: "SW" },
      { name: "Glenn Fossum", address: "Parkvegen 34", postNumber: "1550", city: "Hølen", email: "glenn.fossum@online.no", phone: "+47 901 88 223", golfNumber: "88.9933", aksjeNumber: "135", villaNummer: null, handicap: "19.6", role: "HENGEBUK", innmeldt: "2024", birthDate: "13.02.1960", initials: "GF" },
      { name: "Øyvind Rød", address: "Tårnveien 56", postNumber: "1350", city: "Lommedalen", email: "oyvind.rod@hotmail.com", phone: "+47 912 99 334", golfNumber: "00.1177", aksjeNumber: "246", villaNummer: "4,3", handicap: "15.5", role: "ASPIRANT", innmeldt: "2025", birthDate: "29.10.1964", initials: "ØR2" },
      { name: "Marius Holmen", address: "Kolbotn Sentrum 78", postNumber: "1410", city: "Kolbotn", email: "marius.holmen@gmail.com", phone: "+47 923 00 445", golfNumber: "22.3388", aksjeNumber: "357", villaNummer: null, handicap: "12.4", role: "ANDRE", innmeldt: "2020", birthDate: "08.12.1970", initials: "MH" },
      { name: "Bjarte Haugen", address: "Stasjonsvegen 91", postNumber: "1560", city: "Larkollen", email: "bjarte.haugen@yahoo.no", phone: "+47 934 11 556", golfNumber: "44.5500", aksjeNumber: "468", villaNummer: "3,4", handicap: "21.1", role: "HENGEBUK", innmeldt: "2021", birthDate: "20.05.1949", initials: "BH" },
      { name: "Are Knutsen", address: "Rådhusplassen 23", postNumber: "1570", city: "Dilling", email: "are.knutsen@online.no", phone: "+47 945 22 667", golfNumber: "66.7711", aksjeNumber: "579", villaNummer: null, handicap: "18.9", role: "ASPIRANT", innmeldt: "2022", birthDate: "04.07.1956", initials: "AK" },
      { name: "Ragnar Eikeland", address: "Industriveien 45", postNumber: "1580", city: "Rygge", email: "ragnar.eikeland@gmail.com", phone: "+47 956 33 778", golfNumber: "88.9944", aksjeNumber: "680", villaNummer: "2,1", handicap: "14.6", role: "ANDRE", innmeldt: "2023", birthDate: "15.11.1963", initials: "RE" },
      { name: "Vidar Sørum", address: "Hovedgata 67", postNumber: "1590", city: "Engelsviken", email: "vidar.sorum@hotmail.com", phone: "+47 967 44 889", golfNumber: "00.1188", aksjeNumber: "791", villaNummer: null, handicap: "16.1", role: "HENGEBUK", innmeldt: "2024", birthDate: "26.08.1965", initials: "VS" },
      { name: "Eirik Valle", address: "Lysakerelven 89", postNumber: "1325", city: "Lysaker", email: "eirik.valle@yahoo.no", phone: "+47 978 55 990", golfNumber: "22.3399", aksjeNumber: "802", villaNummer: "1,5", handicap: "13.1", role: "ASPIRANT", innmeldt: "2025", birthDate: "12.04.1968", initials: "EV" }
    ];

    await db.insert(members).values(sampleMembers);

    // Create regular users for non-admin members
    const regularMembers = sampleMembers.filter(m => 
      m.name !== "Svein Hilmersen" && m.name !== "Bjørn Mørck"
    );
    
    for (const member of regularMembers) {
      const password = member.name.toLowerCase().split(' ')[0] + "123";
      await db.insert(users).values({ 
        name: member.name, 
        username: member.name, 
        password: password,
        role: "Gjest" 
      });
    }
  }

  // Members
  async getMembers(): Promise<Member[]> {
    return await db.select().from(members).orderBy(sql`COALESCE(${members.displayOrder}, 999999)::numeric`);
  }

  async getMember(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async createMember(memberData: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(memberData).returning();
    return member;
  }

  async updateMember(id: string, memberData: Partial<InsertMember>): Promise<Member | undefined> {
    const [member] = await db
      .update(members)
      .set(memberData)
      .where(eq(members.id, id))
      .returning();
    return member;
  }

  async updateMemberOrder(memberIds: string[]): Promise<void> {
    // Update display order for each member based on their position in the array
    for (let i = 0; i < memberIds.length; i++) {
      await db
        .update(members)
        .set({ displayOrder: sql`${i}` })
        .where(eq(members.id, memberIds[i]));
    }
  }

  async deleteMember(id: string): Promise<boolean> {
    const result = await db.delete(members).where(eq(members.id, id)).returning();
    return result.length > 0;
  }

  // Spain Presence
  async getSpainPresence(): Promise<SpainPresence[]> {
    return await db.select().from(spainPresence);
  }

  async getSpainPresenceByMember(memberId: string): Promise<SpainPresence[]> {
    return await db.select().from(spainPresence).where(eq(spainPresence.memberId, memberId));
  }

  async createSpainPresence(presenceData: InsertSpainPresence): Promise<SpainPresence> {
    const [presence] = await db.insert(spainPresence).values(presenceData).returning();
    return presence;
  }

  async updateSpainPresence(id: string, presenceData: Partial<InsertSpainPresence>): Promise<SpainPresence | undefined> {
    const [presence] = await db
      .update(spainPresence)
      .set(presenceData)
      .where(eq(spainPresence.id, id))
      .returning();
    return presence;
  }

  async deleteSpainPresence(id: string): Promise<boolean> {
    const result = await db.delete(spainPresence).where(eq(spainPresence.id, id)).returning();
    return result.length > 0;
  }

  // Tee Times
  async getTeeTimes(): Promise<TeeTime[]> {
    return await db.select().from(teeTimes);
  }

  async getTeeTimesByDateRange(startDate: string, endDate: string): Promise<TeeTime[]> {
    return await db.select().from(teeTimes)
      .where(sql`${teeTimes.date} >= ${startDate} AND ${teeTimes.date} <= ${endDate}`);
  }

  async createTeeTime(teeTimeData: InsertTeeTime): Promise<TeeTime> {
    const [teeTime] = await db.insert(teeTimes).values(teeTimeData).returning();
    return teeTime;
  }

  async deleteTeeTime(id: string): Promise<boolean> {
    const result = await db.delete(teeTimes).where(eq(teeTimes.id, id)).returning();
    return result.length > 0;
  }

  // Social Events
  async getSocialEvents(): Promise<SocialEvent[]> {
    return await db.select().from(socialEvents);
  }

  async getSocialEvent(id: string): Promise<SocialEvent | undefined> {
    const [event] = await db.select().from(socialEvents).where(eq(socialEvents.id, id));
    return event;
  }

  async createSocialEvent(eventData: InsertSocialEvent): Promise<SocialEvent> {
    const [event] = await db.insert(socialEvents).values(eventData).returning();
    return event;
  }

  async updateSocialEvent(id: string, eventData: Partial<InsertSocialEvent>): Promise<SocialEvent | undefined> {
    const [event] = await db
      .update(socialEvents)
      .set(eventData)
      .where(eq(socialEvents.id, id))
      .returning();
    return event;
  }

  async deleteSocialEvent(id: string): Promise<boolean> {
    const result = await db.delete(socialEvents).where(eq(socialEvents.id, id)).returning();
    return result.length > 0;
  }

  // Event RSVPs
  async getAllEventRsvps(): Promise<EventRsvp[]> {
    return await db.select().from(eventRsvps);
  }

  async getEventRsvps(eventId: string): Promise<EventRsvp[]> {
    return await db.select().from(eventRsvps).where(eq(eventRsvps.eventId, eventId));
  }

  async createEventRsvp(rsvpData: InsertEventRsvp): Promise<EventRsvp> {
    const [rsvp] = await db.insert(eventRsvps).values(rsvpData).returning();
    return rsvp;
  }

  async deleteEventRsvp(eventId: string, memberId: string): Promise<boolean> {
    const result = await db.delete(eventRsvps)
      .where(sql`${eventRsvps.eventId} = ${eventId} AND ${eventRsvps.memberId} = ${memberId}`)
      .returning();
    return result.length > 0;
  }

  // Social Messages
  async getSocialMessages(): Promise<SocialMessage[]> {
    return await db.select().from(socialMessages).orderBy(sql`${socialMessages.createdAt} DESC`);
  }

  async createSocialMessage(messageData: InsertSocialMessage): Promise<SocialMessage> {
    const [message] = await db.insert(socialMessages).values(messageData).returning();
    return message;
  }

  async deleteSocialMessage(id: string): Promise<boolean> {
    const result = await db.delete(socialMessages).where(eq(socialMessages.id, id)).returning();
    return result.length > 0;
  }

  // Absence operations
  async getAbsences(): Promise<Absence[]> {
    return await db.select().from(absences);
  }

  async getAbsencesByDateRange(startDate: string, endDate: string): Promise<Absence[]> {
    return await db.select().from(absences).where(
      sql`${absences.date} >= ${startDate} AND ${absences.date} <= ${endDate}`
    );
  }

  async getAbsence(id: string): Promise<Absence | undefined> {
    const [absence] = await db.select().from(absences).where(eq(absences.id, id));
    return absence;
  }

  async createAbsence(absence: InsertAbsence): Promise<Absence> {
    const [newAbsence] = await db.insert(absences).values(absence).returning();
    return newAbsence;
  }

  async updateAbsence(id: string, absence: Partial<InsertAbsence>): Promise<Absence | undefined> {
    const [updated] = await db
      .update(absences)
      .set(absence)
      .where(eq(absences.id, id))
      .returning();
    return updated;
  }

  async deleteAbsence(id: string): Promise<boolean> {
    const result = await db.delete(absences).where(eq(absences.id, id)).returning();
    return result.length > 0;
  }
}

const storage = new DatabaseStorage();

// Initialize database if not already done
(async () => {
  try {
    await storage.initializeDatabase();
    console.log("Database initialized successfully");
    
    // Sync user accounts with existing members
    await storage.syncUsersWithMembers();
    console.log("User-member synchronization completed");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
})();

export { storage };


