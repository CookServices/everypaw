const SERVICE_ROLE_KEY = "REMPLACE_PAR_SERVICE_ROLE_KEY";
const PROJECT_REF = "REMPLACE_PAR_PROJECT_REF";

const users = [
  { email: "test-free@yopmail.com",          name: "Alice Free" },
  { email: "test-digital@yopmail.com",        name: "Bob Digital" },
  { email: "test-print-fresh@yopmail.com",    name: "Claire Print Fresh" },
  { email: "test-print-ordered@yopmail.com",  name: "David Print Ordered" },
  { email: "test-print-multi@yopmail.com",    name: "Eve Multi Credit" },
];

for (const u of users) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: u.email,
      password: "Test1234!",
      email_confirm: true,
      user_metadata: { full_name: u.name },
    }),
  });
  const data = await res.json();
  console.log(u.email, "→", data.id ?? data.error ?? JSON.stringify(data));
}
