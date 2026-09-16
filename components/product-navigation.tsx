type Active='central'|'plantao'|'cases'|'review'|'syllabus'|'profile';

type Props={
  active:Active;
  syllabusId?:string|null;
  rightHref?:string;
  rightLabel?:string;
};

const item=(active:Active,id:Active,href:string,label:string)=><a className={active===id?'active':''} href={href}>{label}</a>;

export function ProductHeader({active,syllabusId,rightHref='/dashboard',rightLabel='← Central'}:Props){
  return <header className="jqProductTop">
    <a href="/dashboard" className="jqProductBrand">JURIS<span>QUEST</span></a>
    <nav>
      {item(active,'central','/dashboard','Central')}
      {item(active,'plantao','/plantao','Plantão')}
      {item(active,'cases','/archive','Casos')}
      {item(active,'review','/review','Revisão')}
      {syllabusId&&item(active,'syllabus',`/syllabus/${syllabusId}`,'Edital')}
      {item(active,'profile','/profile','Perfil')}
    </nav>
    <div className="jqProductState"><i/> JURISQUEST ONLINE</div>
    <a className="jqProductBack" href={rightHref}>{rightLabel}</a>
  </header>;
}

export function ProductMobileNav({active,syllabusId}:Pick<Props,'active'|'syllabusId'>){
  return <nav className="jqProductMobileNav">
    {item(active,'central','/dashboard','Início')}
    {item(active,'plantao','/plantao','Plantão')}
    {item(active,'cases','/archive','Casos')}
    {item(active,'review','/review','Revisão')}
    {syllabusId?item(active,'syllabus',`/syllabus/${syllabusId}`,'Edital'):item(active,'profile','/profile','Perfil')}
  </nav>;
}
