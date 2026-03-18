import Link from "next/link";
import {BookCardProps} from "@/types";
import Image from "next/image";

const BookCard = ({ title, author, coverURL, slug }: BookCardProps) => {
    return (
        <Link href={`/books/${slug}`}>
            <article className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200">
                <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center p-4">
                    <Image src={coverURL} alt={title} width={160} height={240} className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-1 leading-tight">{title}</h3>
                    <p className="text-gray-600 text-sm">{author}</p>
                </div>
            </article>
        </Link>
    )
}
export default BookCard
