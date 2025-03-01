import { MailIcon, PhoneIcon } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-8 border-t py-4">
      <div className="container mx-auto flex flex-col justify-between px-4 md:flex-row">
        <div className="flex flex-col space-y-2 md:flex-row md:space-x-4 md:space-y-0">
          <div className="flex items-center text-sm text-footerGray">
            <MailIcon className="mr-2 h-4 w-4" />
            emailaddress@mail.com
          </div>
          <div className="flex items-center text-sm text-footerGray">
            <PhoneIcon className="mr-2 h-4 w-4" />
            +82 1234 5678
          </div>
        </div>
        <div className="mt-4 flex space-x-4 text-sm text-footerGray md:mt-0">
          <a href="#" className="hover:text-gray-600">
            Terms of Use
          </a>
          <a href="#" className="hover:text-gray-600">
            Privacy Policy
          </a>
          <span>Copyright © Peterdraw</span>
        </div>
      </div>
    </footer>
  )
}

