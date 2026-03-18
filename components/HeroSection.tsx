import React from 'react'
import Link from 'next/link'

const HeroSection = () => {
    return (
        <section className="py-20 md:py-32">
            <div className="wrapper text-center">
                <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                    Transform Books into
                    <span className="text-blue-600 block">Conversations</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                    Upload your PDFs and engage in interactive AI-powered voice conversations with your favorite books.
                </p>
                <Link href="/books/new" className="inline-flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                    <span>Get Started</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </Link>
            </div>
        </section>
    )
}

export default HeroSection
