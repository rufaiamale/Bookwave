import UploadForm from "@/components/UploadForm";

const Page = () => {
    return (
        <main className="min-h-screen bg-gray-50">
            <section className="wrapper py-16">
                <div className="max-w-2xl mx-auto text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Add a New Book</h1>
                    <p className="text-lg text-gray-600">Upload a PDF to create your interactive reading experience with AI-powered voice conversations</p>
                </div>

                <UploadForm />
            </section>
        </main>
    )
}

export default Page
