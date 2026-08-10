import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <h1 className="text-4xl font-bold mb-4">
        Cold Email &amp; Referral Outreach
      </h1>
      <p className="text-gray-600 mb-8">
        Automate personalized cold email campaigns for job referral outreach.
        Parse Apollo.io data, review leads, and dispatch emails at a safe rate.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/campaigns/new"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          New Campaign
        </Link>
        <Link
          href="/campaigns"
          className="border border-gray-300 px-6 py-2 rounded hover:bg-gray-50"
        >
          View Campaigns
        </Link>
      </div>
    </div>
  );
}
