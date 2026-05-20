function Loader({ page }) {
    return (     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#004687] mx-auto mb-4" />
                    <p className="text-gray-600">Loading {page}...</p>
                </div>
            </div>
    )
}

export default Loader;