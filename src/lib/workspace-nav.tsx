import type { ReactNode, SVGProps } from "react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type SidebarNavSection = {
  /** When set, labels this block (e.g. “Inventory”). Omit for top-level links. */
  title?: string;
  items: SidebarNavItem[];
};

type SidebarIconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function UsersIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
    </svg>
  );
}

function SparePartsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M21,5.25h-2c-.4140625,0-.75.3359375-.75.75v1.25h-1.9394531l-2.7802734-2.7802734c-.140625-.140625-.3310547-.2197266-.5302734-.2197266h-2.25v-1.5h3.25c.4140625,0,.75-.3359375.75-.75s-.3359375-.75-.75-.75H6c-.4140625,0-.75.3359375-.75.75s.3359375.75.75.75h3.25v1.5h-3.25c-.1992188,0-.3896484.0791016-.5302734.2197266l-1.7802734,1.7802734H1c-.4140625,0-.75.3359375-.75.75v12c0,.4140625.3359375.75.75.75h2.6894531l2.7802734,2.7802734c.140625.140625.3310547.2197266.5302734.2197266h9c.4140625,0,.75-.3359375.75-.75v-3.25h1.5v1.25c0,.4140625.3359375.75.75.75h2c1.5166016,0,2.75-1.2333984,2.75-2.75v-10c0-1.5166016-1.2333984-2.75-2.75-2.75ZM22.25,18c0,.6894531-.5605469,1.25-1.25,1.25h-1.25v-1.25c0-.4140625-.3359375-.75-.75-.75h-3c-.4140625,0-.75.3359375-.75.75v3.25h-7.9394531l-2.7802734-2.7802734c-.140625-.140625-.3310547-.2197266-.5302734-.2197266H1.75V7.75h2.25c.1992188,0,.3896484-.0791016.5302734-.2197266l1.7802734-1.7802734h6.3789062l2.7802734,2.7802734c.140625.140625.3310547.2197266.5302734.2197266h3c.4140625,0,.75-.3359375.75-.75v-1.25h1.25c.6894531,0,1.25.5605469,1.25,1.25v10Z" />
    </svg>
  );
}
function MaintenancePartsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M22.0583496,9.3961182c-.0253906-.0238037-10.6762695-7.4938965-10.699707-7.5068359-1.1795654-1.0075684-2.6895752-1.6392822-4.3586426-1.6392822C3.2783203.25.25,3.2783203.25,7c0,.7332764.1470947,1.4265137.3643799,2.0881348.0054932.0469971,3.7827148,11.8962402,3.7867432,11.9071045.4393311,1.5827637,1.8782959,2.7547607,3.598877,2.7547607.598877,0,1.1577148-.1541748,1.6604004-.4050293.0141602-.0064697,11.7028809-6.2456055,11.7275391-6.2628174,1.4058838-.8258057,2.3620605-2.3372803,2.3620605-4.0821533,0-1.4487305-.6657715-2.7319336-1.6916504-3.6038818ZM1.75,7C1.75,4.1054688,4.1054688,1.75,7,1.75s5.25,2.3554688,5.25,5.25-2.3554688,5.25-5.25,5.25S1.75,9.8945312,1.75,7ZM8,22.25c-1.2402344,0-2.25-1.0097656-2.25-2.25s1.0097656-2.25,2.25-2.25,2.25,1.0097656,2.25,2.25-1.0097656,2.25-2.25,2.25ZM11.6920166,20.5733643c.0292969-.1883545.0579834-.3770752.0579834-.5733643,0-2.0673828-1.6826172-3.75-3.75-3.75-1.2567139,0-2.3649902.6268311-3.0458984,1.5788574l-1.6612549-5.1984863c1.0654297.7038574,2.3375244,1.1196289,3.7071533,1.1196289,3.7216797,0,6.75-3.0283203,6.75-6.75,0-.6337891-.1160889-1.2352295-.2801514-1.8172607l4.5319824,3.177002c-2.1407471.4604492-3.7518311,2.3640137-3.7518311,4.6402588,0,2.0881348,1.3634033,3.8459473,3.2398682,4.480957l-5.7978516,3.0924072ZM19,16.25c-1.7919922,0-3.25-1.4580078-3.25-3.25s1.4580078-3.25,3.25-3.25c.6036377,0,1.1623535.1763916,1.6472168.4642334l.3820801.2678223c.7381592.5963135,1.2207031,1.4973145,1.2207031,2.5179443,0,1.7919922-1.4580078,3.25-3.25,3.25ZM9.75,7c0-1.5166016-1.2333984-2.75-2.75-2.75s-2.75,1.2333984-2.75,2.75,1.2333984,2.75,2.75,2.75,2.75-1.2333984,2.75-2.75ZM5.75,7c0-.6894531.5605469-1.25,1.25-1.25s1.25.5605469,1.25,1.25-.5605469,1.25-1.25,1.25-1.25-.5605469-1.25-1.25ZM19.75,13c0,.4141846-.3358154.75-.75.75s-.75-.3358154-.75-.75.3358154-.75.75-.75.75.3358154.75.75Z" />
    </svg>
  );
}
function AlarmIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.41 5.956-2.738 7.326" />
    </svg>
  );
}

function ProductsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      {...props}
    >
      <path d="M27.359375,12.2978516l-5.65625-5.65625c-.8847656-.8847656-2.109375-1.3916016-3.359375-1.3916016h-3.59375v-3.25c0-.9648438-.7851562-1.75-1.75-1.75h-6c-.9648438,0-1.75.7851562-1.75,1.75v3.3670654c-1.1500244.3289795-2,1.3781738-2,2.6329346v21c0,1.5166016,1.234375,2.75,2.75,2.75h20c1.515625,0,2.75-1.2333984,2.75-2.75v-13.3427734c0-1.2685547-.4941406-2.4619141-1.390625-3.359375ZM7,1.75h6c.1386719,0,.25.1123047.25.25v3.25h-6.5v-3.25c0-.1376953.1113281-.25.25-.25ZM27.25,29c0,.6894531-.5605469,1.25-1.25,1.25H6c-.6894531,0-1.25-.5605469-1.25-1.25V8c0-.6894531.5605469-1.25,1.25-1.25h12.34375c.8554688,0,1.6933594.3466797,2.296875.9521484l5.65625,5.65625c.6152344.6142578.953125,1.4306641.953125,2.2988281v13.3427734ZM15.4160156,13.3759766c-.25-.1679688-.5820312-.1679688-.8320312,0-3.6386719,2.4257812-5.3339844,4.8486328-5.3339844,7.6240234,0,3.1708984,2.5800781,5.75,5.75,5.75s5.75-2.5791016,5.75-5.75c0-2.7753906-1.6953125-5.1982422-5.3339844-7.6240234ZM15,25.25c-2.34375,0-4.25-1.90625-4.25-4.25,0-2.1279297,1.3535156-4.0722656,4.25-6.0927734,2.8964844,2.0205078,4.25,3.9648438,4.25,6.0927734,0,2.34375-1.90625,4.25-4.25,4.25Z" />
    </svg>
  );
}

function MaintenanceIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
      {...props}
    >
      <path d="M541.4 162.6C549 155 561.7 156.9 565.5 166.9C572.3 184.6 576 203.9 576 224C576 312.4 504.4 384 416 384C398.5 384 381.6 381.2 365.8 376L178.9 562.9C150.8 591 105.2 591 77.1 562.9C49 534.8 49 489.2 77.1 461.1L264 274.2C258.8 258.4 256 241.6 256 224C256 135.6 327.6 64 416 64C436.1 64 455.4 67.7 473.1 74.5C483.1 78.3 484.9 91 477.4 98.6L388.7 187.3C385.7 190.3 384 194.4 384 198.6L384 240C384 248.8 391.2 256 400 256L441.4 256C445.6 256 449.7 254.3 452.7 251.3L541.4 162.6z" />
    </svg>
  );
}

function BikesIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
      {...props}
    >
      <path d="M280 80C266.7 80 256 90.7 256 104C256 117.3 266.7 128 280 128L336.6 128L359.1 176.7L264 248C230.6 222.9 189 208 144 208L88 208C74.7 208 64 218.7 64 232C64 245.3 74.7 256 88 256L144 256C222.5 256 287.2 315.6 295.2 392L269.8 392C258.6 332.8 206.5 288 144 288C73.3 288 16 345.3 16 416C16 486.7 73.3 544 144 544C206.5 544 258.5 499.2 269.8 440L320 440C333.3 440 344 429.3 344 416L344 393.5C344 348.4 369.7 308.1 409.5 285.8L421.6 311.9C389.2 335.1 368.1 373.1 368.1 416C368.1 486.7 425.4 544 496.1 544C566.8 544 624.1 486.7 624.1 416C624.1 345.3 566.8 288 496.1 288C485.4 288 475.1 289.3 465.2 291.8L433.8 224L488 224C501.3 224 512 213.3 512 200L512 152C512 138.7 501.3 128 488 128L434.7 128C427.8 128 421 130.2 415.5 134.4L398.4 147.2L373.8 93.9C369.9 85.4 361.4 80 352 80L280 80zM445.8 364.4L474.2 426C479.8 438 494 443.3 506 437.7C518 432.1 523.3 417.9 517.7 405.9L489.2 344.3C491.4 344.1 493.6 344 495.9 344C535.7 344 567.9 376.2 567.9 416C567.9 455.8 535.7 488 495.9 488C456.1 488 423.9 455.8 423.9 416C423.9 395.8 432.2 377.5 445.7 364.4zM144 488C104.2 488 72 455.8 72 416C72 376.2 104.2 344 144 344C175.3 344 202 364 211.9 392L144 392C130.7 392 120 402.7 120 416C120 429.3 130.7 440 144 440L211.9 440C202 468 175.3 488 144 488z" />
    </svg>
  );
}

function CreateIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <line x1="12" x2="12" y1="8" y2="16" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}

function TicketsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      {...props}
    >
      <path d="M320 0c17.7 0 32 14.3 32 32l0 32 32 0c35.3 0 64 28.7 64 64l0 288c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 128C0 92.7 28.7 64 64 64l32 0 0-32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 32 128 0 0-32c0-17.7 14.3-32 32-32zm22 161.7c-10.7-7.8-25.7-5.4-33.5 5.3L189.1 331.2 137 279.1c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l72 72c5 5 11.9 7.5 18.8 7s13.4-4.1 17.5-9.8L347.3 195.2c7.8-10.7 5.4-25.7-5.3-33.5z" />
    </svg>
  );
}

function SellerIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 21a8 8 0 0 0-16 0" />
      <circle cx="10" cy="8" r="5" />
      <path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3" />
    </svg>
  );
}

function TransactionsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </svg>
  );
}

function BrandsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
      {...props}
    >
      <path d="M346.6 174.2C338.8 162.5 324.2 157.2 310.7 161.3C297.2 165.4 288 177.9 288 192L288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448L352 297.7L421.4 401.8C427.3 410.7 437.3 416 448 416C458.7 416 468.7 410.7 474.6 401.8L544 297.7L544 448C544 465.7 558.3 480 576 480C593.7 480 608 465.7 608 448L608 192C608 177.9 598.8 165.5 585.3 161.4C571.8 157.3 557.2 162.5 549.4 174.3L448 326.3L346.6 174.2zM32 160C14.3 160 0 174.3 0 192C0 209.7 14.3 224 32 224L96 224L96 448C96 465.7 110.3 480 128 480C145.7 480 160 465.7 160 448L160 224L224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160L32 160z" />
    </svg>
  );
}

function PaymentsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 640"
      fill="currentColor"
      {...props}
    >
      <path d="M192 160L192 144C192 99.8 278 64 384 64C490 64 576 99.8 576 144L576 160C576 190.6 534.7 217.2 474 230.7C471.6 227.9 469.1 225.2 466.6 222.7C451.1 207.4 431.1 195.8 410.2 187.2C368.3 169.7 313.7 160.1 256 160.1C234.1 160.1 212.7 161.5 192.2 164.2C192 162.9 192 161.5 192 160.1zM496 417L496 370.8C511.1 366.9 525.3 362.3 538.2 356.9C551.4 351.4 564.3 344.7 576 336.6L576 352C576 378.8 544.5 402.5 496 417zM496 321L496 288C496 283.5 495.6 279.2 495 275C510.5 271.1 525 266.4 538.2 260.8C551.4 255.2 564.3 248.6 576 240.5L576 255.9C576 282.7 544.5 306.4 496 320.9zM64 304L64 288C64 243.8 150 208 256 208C362 208 448 243.8 448 288L448 304C448 348.2 362 384 256 384C150 384 64 348.2 64 304zM448 400C448 444.2 362 480 256 480C150 480 64 444.2 64 400L64 384.6C75.6 392.7 88.5 399.3 101.8 404.9C143.7 422.4 198.3 432 256 432C313.7 432 368.3 422.3 410.2 404.9C423.4 399.4 436.3 392.7 448 384.6L448 400zM448 480.6L448 496C448 540.2 362 576 256 576C150 576 64 540.2 64 496L64 480.6C75.6 488.7 88.5 495.3 101.8 500.9C143.7 518.4 198.3 528 256 528C313.7 528 368.3 518.3 410.2 500.9C423.4 495.4 436.3 488.7 448 480.6z" />
    </svg>
  );
}

function ReportingIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 14 14"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m0.805 9.105 4.344 -4.344L7.28 6.893l5.27 -5.269"></path>
        <path d="M13.09 3.248c0.087 -0.864 0.087 -1.339 0 -2.165 -0.826 -0.086 -1.3 -0.086 -2.165 0"></path>
        <path d="m4.589 13.099 0 -4.702"></path>
        <path d="m8.922 13.099 0 -4.702"></path>
        <path d="m0.764 11.629 0.196 1.47 11.977 0 0.277 -6.588"></path>
      </g>
    </svg>
  );
}

function ArrowUpDownIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </svg>
  );
}

function RequestsIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function HistoryIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function SearchIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function StocktakeIcon(props: SidebarIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

/** Default sidebar / launcher navigation; filter with `canAccessRoute` on the client. */
export const defaultWorkspaceNavSections: SidebarNavSection[] = [
  {
    items: [
      { href: "/", label: "Home", icon: <HomeIcon className="h-5 w-5" /> },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        href: "/inventory/sales",
        label: "All Sales",
        icon: <TransactionsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/sales/create",
        label: "Create Sale",
        icon: <CreateIcon className="h-5 w-5" />,
      },
      {
        href: "/customers",
        label: "Customers",
        icon: <UsersIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Maintenance",
    items: [
      {
        href: "/tickets",
        label: "Tickets",
        icon: <TicketsIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      {
        href: "/inventory/alarms",
        label: "Alarms",
        icon: <AlarmIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/item-lookup",
        label: "Item Lookup",
        icon: <SearchIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/count",
        label: "Inventory Count",
        icon: <StocktakeIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/spare-parts",
        label: "Spare Parts",
        icon: <SparePartsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/maintenance-parts",
        label: "Maintenance Parts",
        icon: <MaintenancePartsIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/products",
        label: "Products",
        icon: <ProductsIcon className="h-5 w-5" />,
      },
      
      {
        href: "/inventory/bikes",
        label: "Bikes",
        icon: <BikesIcon className="h-5 w-5" />,
      },
      {
        href: "/inventory/maintenance-services",
        label: "Maintenance Services",
        icon: <MaintenanceIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Master Data",
    items: [
      {
        href: "/inventory/brands",
        label: "Brands",
        icon: <BrandsIcon className="h-5 w-5" />,
      },
      {
        href: "/data/bike-blueprints",
        label: "Bike Blueprints",
        icon: <BikesIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        href: "/data/import-export",
        label: "Import & Export",
        icon: <ArrowUpDownIcon className="h-5 w-5" />,
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/requests",
        label: "Requests",
        icon: <RequestsIcon className="h-5 w-5" />,
      },
      {
        href: "/users",
        label: "Users",
        icon: <UsersIcon className="h-5 w-5" />,
      },
      {
        href: "/history",
        label: "History",
        icon: <HistoryIcon className="h-5 w-5" />,
      },
      {
        href: "/sellers",
        label: "Sellers",
        icon: <SellerIcon className="h-5 w-5" />,
      },
      {
        href: "/data/payment-methods",
        label: "Payments",
        icon: <PaymentsIcon className="h-5 w-5" />,
      },
      {
        href: "/reporting",
        label: "Reporting",
        icon: <ReportingIcon className="h-5 w-5" />,
      },
    ],
  },
];
