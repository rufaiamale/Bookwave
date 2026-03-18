import { PricingTable } from "@clerk/nextjs";

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="wrapper py-16">
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-gray-600 max-w-2xl">
            Upgrade to unlock more books, longer sessions, and advanced features.
          </p>
        </div>

        <div className="clerk-pricing-table-wrapper">
          <PricingTable />
        </div>
      </div>
    </div>
  );
}
